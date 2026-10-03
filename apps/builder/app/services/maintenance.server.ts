import { gzipSync } from "node:zlib";
import env from "~/env/env.server";
import { createPostgrestContext } from "~/shared/context.server";
import { createAssetClient } from "~/shared/asset-client";
import { publishBaseSandbox } from "./bdflow-publisher.server";

/**
 * Daily upkeep run by the Vercel cron job (see vercel.json):
 * - a database query, so the free database never pauses for inactivity;
 * - a backup of every table and every uploaded file to Vercel Blob;
 * - a refresh of the prepared publish sandbox so its snapshot never expires.
 */

export const backupPrefix = "backups/";
const databasePrefix = `${backupPrefix}database/`;
const assetsPrefix = `${backupPrefix}assets/`;
const keepDatabaseBackups = 30;
const pageSize = 1000;

// Every table holding data; views are rebuilt by migrations.
export const backupTables = [
  "User",
  "Workspace",
  "WorkspaceMember",
  "Project",
  "ProjectIdPool",
  "Build",
  "Domain",
  "ProjectDomain",
  "AuthorizationToken",
  "File",
  "Asset",
  "AssetFileMetadata",
  "AssetFolder",
  "FormSubmission",
  "Notification",
  "Product",
  "TransactionLog",
  "ClientReferences",
] as const;

type UntypedClient = {
  from: (table: string) => {
    select: (columns: string) => {
      range: (
        from: number,
        to: number
      ) => PromiseLike<{
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

const getClient = () =>
  createPostgrestContext().client as unknown as UntypedClient;

export const pingDatabase = async () => {
  const result = await getClient().from("Project").select("id").range(0, 0);
  if (result.error) {
    throw new Error(`Database is not reachable: ${result.error.message}`);
  }
};

const readTable = async (table: string) => {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await getClient()
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (result.error) {
      throw new Error(`${table}: ${result.error.message}`);
    }
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < pageSize) {
      return rows;
    }
  }
};

export const isBackupConfigured = () =>
  (process.env.BLOB_READ_WRITE_TOKEN ?? "") !== "";

/** Writes backups/database/<date>.json.gz and keeps the latest 30. */
export const backupDatabase = async (now = new Date()) => {
  const { put, list, del } = await import("@vercel/blob");
  const tables: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  for (const table of backupTables) {
    tables[table] = await readTable(table);
    counts[table] = tables[table].length;
  }
  const body = gzipSync(
    JSON.stringify({ version: 1, createdAt: now.toISOString(), tables })
  );
  const pathname = `${databasePrefix}${now.toISOString().slice(0, 10)}.json.gz`;
  await put(pathname, body, {
    access: "private",
    contentType: "application/gzip",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const { blobs } = await list({ prefix: databasePrefix, limit: 1000 });
  const old = blobs
    .sort((a, b) => b.pathname.localeCompare(a.pathname))
    .slice(keepDatabaseBackups);
  if (old.length > 0) {
    await del(old.map((blob) => blob.url));
  }
  return { pathname, bytes: body.length, counts };
};

const collect = async (data: AsyncIterable<Uint8Array>) => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of data) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/** Copies uploaded files that are not backed up yet; files never change. */
export const backupAssets = async (deadline: number) => {
  const { put, list } = await import("@vercel/blob");
  const files = await readTable("File");
  const saved = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: assetsPrefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      saved.add(blob.pathname.slice(assetsPrefix.length));
    }
    cursor = page.cursor;
  } while (cursor);

  const assetClient = createAssetClient();
  let copied = 0;
  let pending = 0;
  for (const file of files) {
    const name = String(file.name ?? "");
    if (name === "" || saved.has(name) || file.isDeleted === true) {
      continue;
    }
    if (Date.now() > deadline) {
      pending += 1;
      continue;
    }
    const { data } = await assetClient.readFile(name);
    await put(`${assetsPrefix}${name}`, await collect(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    copied += 1;
  }
  return { copied, pending };
};

export const latestDatabaseBackup = async () => {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: databasePrefix, limit: 1000 });
  return blobs.sort((a, b) => b.pathname.localeCompare(a.pathname))[0];
};

/**
 * Brings the prepared publish sandbox up to the pinned version and stops it,
 * which saves a fresh snapshot for publishes to start from.
 */
export const refreshPublishBase = async () => {
  const { Sandbox } = await import("@vercel/sandbox");
  const sandbox = await Sandbox.get({ name: publishBaseSandbox });
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      [
        "set -e",
        'cd "$(dirname "$(find /vercel -maxdepth 3 -path "*/scripts/bdflow-publish.sh" | head -1)")/.."',
        'git fetch -q --depth 1 origin "$UPDATE_REF"',
        "git reset -q --hard FETCH_HEAD",
        "PREPARE_ONLY=1 bash scripts/bdflow-publish.sh",
      ].join("\n"),
    ],
    env: { UPDATE_REF: env.BDFLOW_PUBLISH_REF },
  });
  const output = await result.output("both");
  await sandbox.stop();
  if (result.exitCode !== 0) {
    throw new Error(`Publish sandbox refresh failed: ${output.slice(-500)}`);
  }
};
