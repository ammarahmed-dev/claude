import {
  isBackupConfigured,
  latestDatabaseBackup,
  pingDatabase,
} from "~/services/maintenance.server";

const maxBackupAgeHours = 36;

// Checked every few hours by .github/workflows/bdflow-health.yml; any
// non-200 answer emails the repository owner.
export const loader = async () => {
  const problems: string[] = [];
  await pingDatabase().catch((error: Error) => problems.push(error.message));

  let backupAgeHours: number | undefined;
  if (isBackupConfigured()) {
    const latest = await latestDatabaseBackup().catch(() => undefined);
    if (latest === undefined) {
      problems.push("No database backup yet");
    } else {
      backupAgeHours =
        Math.round(
          ((Date.now() - new Date(latest.uploadedAt).getTime()) / 36e5) * 10
        ) / 10;
      if (backupAgeHours > maxBackupAgeHours) {
        problems.push(`Latest backup is ${backupAgeHours} hours old`);
      }
    }
  } else {
    problems.push("Backup storage is not connected");
  }

  return new Response(
    JSON.stringify({ ok: problems.length === 0, problems, backupAgeHours }),
    {
      status: problems.length === 0 ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
