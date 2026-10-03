#!/usr/bin/env node
// Restores a BD Flow database backup made by the daily job.
//
// Usage:
//   POSTGREST_URL=... POSTGREST_API_KEY=... node scripts/bdflow-restore.mjs backup.json.gz
//
// Download the backup from the Vercel dashboard (Storage > bdflow-backups >
// backups/database/<date>.json.gz). Rows are upserted, so running it against
// a database that still has data only brings back what is missing or changed.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [file] = process.argv.slice(2);
const url = process.env.POSTGREST_URL;
const key = process.env.POSTGREST_API_KEY;
if (file === undefined || url === undefined || key === undefined) {
  console.error(
    "Usage: POSTGREST_URL=... POSTGREST_API_KEY=... node scripts/bdflow-restore.mjs <backup.json.gz>"
  );
  process.exit(1);
}

const backup = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
console.log(`Backup from ${backup.createdAt}`);

// parents before children so foreign keys resolve
const order = [
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
  "AssetFolder",
  "Asset",
  "AssetFileMetadata",
  "FormSubmission",
  "Notification",
  "Product",
  "TransactionLog",
  "ClientReferences",
];

for (const table of order) {
  const rows = backup.tables[table] ?? [];
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    const response = await fetch(`${url}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (response.ok === false) {
      console.error(`${table}: ${response.status} ${await response.text()}`);
      process.exit(1);
    }
  }
  console.log(`${table}: ${rows.length} rows`);
}
