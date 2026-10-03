import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  backupAssets,
  backupDatabase,
  isBackupConfigured,
  pingDatabase,
  refreshPublishBase,
} from "~/services/maintenance.server";

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const run = async (task: () => Promise<unknown>) => {
  try {
    return { ok: true, result: await task() };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Vercel calls this once a day (vercel.json) with the CRON_SECRET.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const secret = process.env.CRON_SECRET ?? "";
  if (
    secret === "" ||
    request.headers.get("Authorization") !== `Bearer ${secret}`
  ) {
    return reply(401, { ok: false });
  }
  const started = Date.now();
  const database = await run(pingDatabase);
  const backup = isBackupConfigured()
    ? await run(() => backupDatabase())
    : { ok: false, error: "Blob storage is not connected" };
  // leave time for the sandbox refresh within the 60 second limit
  const assets = isBackupConfigured()
    ? await run(() => backupAssets(started + 25_000))
    : { ok: false, error: "Blob storage is not connected" };
  const publisher = await run(refreshPublishBase);
  const ok = database.ok && backup.ok && assets.ok && publisher.ok;
  return reply(ok ? 200 : 500, { ok, database, backup, assets, publisher });
};
