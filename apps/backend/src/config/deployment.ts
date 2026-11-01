import { z } from "zod";

export const DEV_SITE_ID = "8406a938-5101-431f-964f-8b4e61d8f223";
export const PROD_SITE_ID = "3df9e8cb-b1c3-456a-ac32-60c043756d4c";
export const DEV_ORIGIN = "https://debugclinic-dev.netlify.app";
export const PROD_ORIGIN = "https://debugclinic-prod.netlify.app";
export const DEV_PREVIEW_ORIGIN_PATTERN =
  "https://deploy-preview-*--debugclinic-dev.netlify.app";
const previewOrigin =
  /^https:\/\/deploy-preview-[1-9]\d*--debugclinic-dev\.netlify\.app$/;

export function isDevelopmentOrigin(origin: string): boolean {
  return origin === DEV_ORIGIN || previewOrigin.test(origin);
}

const metadataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("local") }).strict(),
  z
    .object({
      kind: z.literal("development"),
      origin: z.literal(DEV_ORIGIN),
      siteId: z.literal(DEV_SITE_ID),
    })
    .strict(),
  z
    .object({
      kind: z.literal("preview"),
      origin: z.string().regex(previewOrigin),
      siteId: z.literal(DEV_SITE_ID),
    })
    .strict(),
  z
    .object({
      kind: z.literal("production"),
      origin: z.literal(PROD_ORIGIN),
      siteId: z.literal(PROD_SITE_ID),
    })
    .strict(),
]);
export type DeploymentMetadata = z.infer<typeof metadataSchema>;

/** Read only platform-owned build metadata, never request Host headers. */
export function deploymentFromBuild(
  source: NodeJS.ProcessEnv,
): DeploymentMetadata {
  const siteId = source["SITE_ID"] ?? source["NETLIFY_SITE_ID"];
  const context = source["CONTEXT"];
  if (!siteId) {
    if (source["NETLIFY"] === "true" || context === "deploy-preview") {
      throw new Error("Netlify build metadata is missing SITE_ID");
    }
    return { kind: "local" };
  }
  if (context === "deploy-preview") {
    if (
      siteId !== DEV_SITE_ID ||
      !/^[1-9]\d*$/.test(source["REVIEW_ID"] ?? "")
    ) {
      throw new Error(
        "Only numbered development-site PR previews are supported",
      );
    }
    const origin = source["DEPLOY_PRIME_URL"];
    if (
      origin !==
      `https://deploy-preview-${source["REVIEW_ID"]}--debugclinic-dev.netlify.app`
    ) {
      throw new Error(
        "Netlify preview origin does not match this site's PR number",
      );
    }
    return metadataSchema.parse({ kind: "preview", siteId, origin });
  }
  if (context && context !== "production" && context !== "dev") {
    throw new Error("Unsupported Netlify deployment context");
  }
  if (siteId === DEV_SITE_ID)
    return { kind: "development", siteId, origin: DEV_ORIGIN };
  if (siteId === PROD_SITE_ID)
    return { kind: "production", siteId, origin: PROD_ORIGIN };
  throw new Error(
    "Unknown Netlify site; configure an explicit deployment mapping first",
  );
}

/** Bundled metadata is public configuration; credentials stay in runtime env. */
export function deploymentEnvironment(
  source: NodeJS.ProcessEnv,
  metadata: unknown,
): NodeJS.ProcessEnv {
  const deployment = metadataSchema.parse(metadata);
  if (deployment.kind === "local") return { ...source };
  const runtimeSiteId = source["SITE_ID"];
  if (runtimeSiteId && runtimeSiteId !== deployment.siteId) {
    throw new Error(
      "Bundled deployment metadata belongs to a different Netlify site",
    );
  }
  return {
    ...source,
    NODE_ENV: "production",
    APP_ORIGIN: deployment.origin,
    CORS_ORIGINS: deployment.origin,
    BETTER_AUTH_URL: deployment.origin,
    ...(deployment.kind === "preview" ? { AI_PROVIDER: "fake" } : {}),
  };
}

/** Native development builds migrate before publishing; never target prod. */
export function assertDevelopmentMigrationTarget(
  source: NodeJS.ProcessEnv,
): void {
  for (const key of ["DATABASE_URL", "DATABASE_URL_POOLED"] as const) {
    const raw = source[key];
    if (!raw) throw new Error(`Development deployment requires ${key}`);
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(`${key} must be a PostgreSQL URL`);
    }
    const project = "fgfcfqbjgtemffpcpsum";
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !(
        url.hostname === `db.${project}.supabase.co` ||
        (url.hostname.endsWith(".pooler.supabase.com") &&
          decodeURIComponent(url.username).endsWith(`.${project}`))
      )
    ) {
      throw new Error(
        `${key} must target the configured development Supabase project`,
      );
    }
  }
}
