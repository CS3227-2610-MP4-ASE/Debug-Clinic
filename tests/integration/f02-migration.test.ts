// Structural migration evidence, distinct from public application behavior tests.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { expect, it } from "vitest";
import { testDatabaseUrl } from "../support/database-target.js";

const migrations = new URL("../../prisma/migrations/", import.meta.url);
async function sql(name: string): Promise<string> {
  return readFile(new URL(`${name}/migration.sql`, migrations), "utf8");
}
async function rehearse(
  check: (client: Client, upgrade: string) => Promise<void>,
) {
  const target = testDatabaseUrl();
  const client = new Client({ connectionString: target });
  const schema = `f02_rehearsal_${randomUUID().replaceAll("-", "")}`;
  if (!/^f02_rehearsal_[a-f0-9]{32}$/.test(schema))
    throw new Error("Invalid owned rehearsal schema");
  await client.connect();
  try {
    expect(
      (await client.query("SELECT current_database() AS name")).rows,
    ).toEqual([
      { name: decodeURIComponent(new URL(target).pathname.slice(1)) },
    ]);
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    expect(
      (await client.query("SELECT current_schema() AS name")).rows,
    ).toEqual([{ name: schema }]);
    await client.query(await sql("20261101000000_initial"));
    await client.query(await sql("20261105000000_f01_draft_content"));
    await client.query(`
      INSERT INTO "User" (id,name,email,role,"updatedAt") VALUES
        ('owner','Legacy instructor','legacy-owner@example.test','INSTRUCTOR',now()),
        ('learner','Legacy learner','legacy-learner@example.test','LEARNER',now());
      INSERT INTO "Exercise" (id,title,description,status,"authorId","publishedAt","updatedAt") VALUES
        ('draft-a','Original draft','Original problem','DRAFT','owner',NULL,now()),
        ('draft-b','Second draft','Second problem','DRAFT','owner',NULL,now()),
        ('published','Original publication','Published problem','PUBLISHED','owner','2026-01-02T03:04:05Z',now()),
        ('verified','Original verified','Verified problem','VERIFIED','owner',NULL,now()),
        ('incomplete','Legacy incomplete','Incomplete problem','DRAFT','owner',NULL,now());
      INSERT INTO "ExerciseVersion" (id,"exerciseId",version,"buggyCode","expectedBehavior",topic,"bugExplanation","correctedSolution","generationProvenance") VALUES
        ('version-a','draft-a',1,E'def total(v):\\n return 0\\n','Sum every value','Python lists','Legacy explanation',E'def total(v):\\n return sum(v)\\n','{"association":"instructor-reported","legacy":"retained"}'),
        ('version-p','published',1,'print(0)','Print one','Python output','Legacy published explanation','print(1)','{"association":"instructor-reported"}');
      INSERT INTO "HintStage" (id,"exerciseVersionId",stage,title,content,"approvedAt","updatedAt")
        VALUES ('hint','version-p',1,'Look closely','Legacy hint',now(),now());
      INSERT INTO "Attempt" (id,"learnerId","exerciseVersionId","proposedCode",reasoning,"updatedAt")
        VALUES ('attempt','learner','version-p','print(1)','Legacy reasoning',now());
      INSERT INTO "Review" (id,"attemptId","instructorId",decision,comment,"updatedAt")
        VALUES ('review','attempt','owner','APPROVED','Legacy review',now());
      INSERT INTO "AiUsageEvent" (id,"requestId","userId",operation,provider,"promptVersion",status)
        VALUES ('usage','legacy-request','owner','generate-question','fake','fake-question-v1','SUCCEEDED');
    `);
    await check(client, await sql("20261106000000_f02_publication"));
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
}

it("B41 preserves old rows, identities, content, hints, attempts, reviews and FK restrictions", async () => {
  await rehearse(async (client, upgrade) => {
    const tables = [
      "User",
      "Exercise",
      "ExerciseVersion",
      "HintStage",
      "Attempt",
      "Review",
      "AiUsageEvent",
    ];
    const snapshots = new Map<string, unknown>();
    for (const table of tables)
      snapshots.set(
        table,
        (
          await client.query(
            `SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY id`,
          )
        ).rows,
      );
    const foreignKeys = async () =>
      (
        await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE contype='f' AND connamespace=current_schema()::regnamespace ORDER BY conname
    `)
      ).rows;
    const beforeKeys = await foreignKeys();
    await client.query(upgrade);
    for (const table of tables) {
      const omit =
        table === "Exercise"
          ? " - 'editRevision' - 'previewPublicationKey' - 'archivedAt'"
          : table === "AiUsageEvent"
            ? " - 'generationTopicDigest'"
            : "";
      expect(
        (
          await client.query(
            `SELECT to_jsonb(t)${omit} AS row FROM "${table}" t ORDER BY id`,
          )
        ).rows,
      ).toEqual(snapshots.get(table));
    }
    expect(await foreignKeys()).toEqual(beforeKeys);
    expect(
      (
        await client.query(
          'SELECT DISTINCT "editRevision", "previewPublicationKey", "archivedAt" FROM "Exercise"',
        )
      ).rows,
    ).toEqual([
      { editRevision: 0, previewPublicationKey: null, archivedAt: null },
    ]);
    expect(
      (await client.query('SELECT "generationTopicDigest" FROM "AiUsageEvent"'))
        .rows,
    ).toEqual([{ generationTopicDigest: null }]);
    await expect(
      client.query("DELETE FROM \"ExerciseVersion\" WHERE id='version-p'"),
    ).rejects.toMatchObject({ code: "23503" });
    expect((await client.query('SELECT id FROM "Attempt"')).rows).toEqual([
      { id: "attempt" },
    ]);
    expect((await client.query('SELECT id FROM "Review"')).rows).toEqual([
      { id: "review" },
    ]);
  });
});

it("B41 stops old archived rows without real dates and does not fabricate migration data", async () => {
  await rehearse(async (client, upgrade) => {
    await client.query(
      "UPDATE \"Exercise\" SET status='ARCHIVED' WHERE id='draft-a'",
    );
    await client.query("BEGIN");
    await expect(client.query(upgrade)).rejects.toMatchObject({
      message: "Archived exercise timestamps require owner reconciliation",
    });
    await client.query("ROLLBACK");
    expect(
      (
        await client.query(
          `SELECT status,"publishedAt" FROM "Exercise" WHERE id='draft-a'`,
        )
      ).rows,
    ).toEqual([{ status: "ARCHIVED", publishedAt: null }]);
    expect(
      (
        await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='Exercise' AND column_name='archivedAt'`,
        )
      ).rowCount,
    ).toBe(0);
  });
});

it("B41 enforces bounded revisions, retained owner keys, archive timestamps and digest format", async () => {
  await rehearse(async (client, upgrade) => {
    await client.query(upgrade);
    // Existing multiple null keys are compatible; a nonnull owner key is retained.
    await client.query(
      `UPDATE "Exercise" SET "previewPublicationKey"='01234567-89ab-4cde-8fab-0123456789ab' WHERE id='published'`,
    );
    await client.query(
      `UPDATE "Exercise" SET status='ARCHIVED',"archivedAt"='2026-01-03T03:04:05Z' WHERE id='published'`,
    );
    await expect(
      client.query(
        `UPDATE "Exercise" SET "previewPublicationKey"='01234567-89ab-4cde-8fab-0123456789ab' WHERE id='draft-a'`,
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      client.query(
        `UPDATE "Exercise" SET "editRevision"=-1 WHERE id='draft-a'`,
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await client.query(
      `UPDATE "Exercise" SET "editRevision"=2147483647 WHERE id='draft-a'`,
    );
    await expect(
      client.query(
        `UPDATE "Exercise" SET "editRevision"=2147483648 WHERE id='draft-a'`,
      ),
    ).rejects.toMatchObject({ code: "22003" });
    await expect(
      client.query(
        `UPDATE "Exercise" SET "archivedAt"=now() WHERE id='draft-b'`,
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `UPDATE "Exercise" SET status='ARCHIVED' WHERE id='draft-b'`,
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        `UPDATE "AiUsageEvent" SET "generationTopicDigest"='invalid' WHERE id='usage'`,
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await client.query(
      `UPDATE "AiUsageEvent" SET "generationTopicDigest"=$1 WHERE id='usage'`,
      ["de5dbdb878170e00b2c1e94381074058f02b9d3d50211d6e52175cfd591b7b98"],
    );
  });
});
