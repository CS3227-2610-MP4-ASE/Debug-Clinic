import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { normalizeEmail } from "../apps/backend/src/auth/policy.js";

interface Identity {
  id: string;
  email: string;
}

export function protectedMapPath(rawPath: string): string {
  const path = resolve(rawPath);
  const probe = spawnSync(
    "git",
    ["-C", dirname(path), "rev-parse", "--show-toplevel"],
    { encoding: "utf8", windowsHide: true },
  );
  if (
    probe.error ||
    probe.status === 0 ||
    !probe.stderr.includes("not a git repository")
  )
    throw new Error(
      "Rollback map must use an existing protected directory outside every Git worktree",
    );
  return path;
}
export function normalizationPlan(users: Identity[]) {
  const groups = new Map<string, string[]>();
  for (const user of users) {
    const canonical = normalizeEmail(user.email);
    groups.set(canonical, [...(groups.get(canonical) ?? []), user.id]);
  }
  return {
    collisions: [...groups.values()].filter((ids) => ids.length > 1),
    changes: users
      .filter((user) => user.email !== normalizeEmail(user.email))
      .map((user) => ({
        id: user.id,
        before: user.email,
        after: normalizeEmail(user.email),
      })),
  };
}

export async function normalizeIdentities(
  prisma: PrismaClient,
  apply: boolean,
  saveProtectedMap?: (
    changes: ReturnType<typeof normalizationPlan>["changes"],
  ) => Promise<void>,
) {
  return prisma.$transaction(async (tx) => {
    // Owner must pause all writers. Lock prevents supported DB writers racing this snapshot.
    await tx.$executeRawUnsafe(
      'LOCK TABLE "User", "Session", "Verification" IN ACCESS EXCLUSIVE MODE',
    );
    const plan = normalizationPlan(
      await tx.user.findMany({ select: { id: true, email: true } }),
    );
    if (plan.collisions.length)
      throw new Error(
        `Normalization stopped: ${plan.collisions.length} collision group(s); owner decision required`,
      );
    if (!apply) return { changed: plan.changes.length, applied: false };
    if (!saveProtectedMap)
      throw new Error("A protected rollback map writer is required");
    await saveProtectedMap(plan.changes);
    for (const change of plan.changes)
      await tx.user.update({
        where: { id: change.id },
        data: { email: change.after },
      });
    await tx.session.deleteMany();
    await tx.verification.deleteMany();
    return { changed: plan.changes.length, applied: true };
  });
}

async function main() {
  const raw = process.env["DATABASE_URL"];
  if (!raw) throw new Error("Explicit DATABASE_URL required");
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.endsWith("_test") ||
    url.search ||
    url.hash
  )
    throw new Error(
      "This local rehearsal requires an explicit loopback _test target without query or fragment",
    );
  const apply = process.argv.includes("--apply");
  const rawMapPath = process.env["AUTH_NORMALIZATION_MAP"];
  const mapPath = rawMapPath ? protectedMapPath(rawMapPath) : undefined;
  if (apply && (!mapPath || process.env["AUTH_WRITES_PAUSED"] !== "yes"))
    throw new Error(
      "Apply requires paused writers and a protected AUTH_NORMALIZATION_MAP outside Git",
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: raw }),
  });
  try {
    const result = await normalizeIdentities(
      prisma,
      apply,
      mapPath
        ? async (changes) => {
            await writeFile(resolve(mapPath), JSON.stringify(changes), {
              flag: "wx",
              mode: 0o600,
            });
          }
        : undefined,
    );
    console.info(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void main().catch(() => {
    console.error(
      "Normalization failed; no successful transition is claimed. Review the protected target and owner procedure.",
    );
    process.exitCode = 1;
  });
