# Running BD Flow

How the live editor (https://bdflow-studio.vercel.app) and published sites are kept running.

## Where things live

| Part                        | Service                                      | Notes                                                                 |
| --------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| Editor and dashboard        | Vercel project `bdflow-studio`               | Deployed by hand from a tested commit.                                |
| Database and uploaded files | Supabase                                     | Free plan; kept awake by the daily job.                               |
| Published sites             | Cloudflare Pages, `<site>.pages.dev`         | One Pages project per site; custom domains are attached to it.        |
| Publish builds              | Vercel Sandbox                               | Each publish forks the prepared sandbox `bdflow-publisher`.           |
| Backups                     | Vercel Blob store `bdflow-backups` (private) | `backups/database/<date>.json.gz` (30 kept), `backups/assets/<file>`. |

## Daily job

Vercel runs `/rest/cron/daily` at 06:17 UTC (`apps/builder/vercel.json`). It:

1. queries the database, so the free plan never pauses it;
2. writes a database backup and copies new uploaded files to Vercel Blob;
3. refreshes the `bdflow-publisher` sandbox to the version in `BDFLOW_PUBLISH_REF` and saves a new snapshot,
   so publishes always start with the tools installed.

Its result is in Vercel > bdflow-studio > Logs (filter by `/rest/cron/daily`).

## Health alerts

`.github/workflows/bdflow-health.yml` checks the editor and `/rest/health` every 6 hours.
`/rest/health` fails when the database does not answer or the latest backup is older than 36 hours.
GitHub emails the repository owner when a scheduled run fails.

## Publishing version

Publishing builds with the commit in the Vercel setting `BDFLOW_PUBLISH_REF`, not the latest code,
so an unfinished change cannot break publishing. To release a new version:

1. build a test site in a sandbox at the new commit (`PREPARE_ONLY=1 bash scripts/bdflow-publish.sh`, then the build steps);
2. set `BDFLOW_PUBLISH_REF` to that commit and redeploy the editor;
3. the next daily job (or publish) picks it up.

## Restoring a backup

1. Download `backups/database/<date>.json.gz` from Vercel > Storage > bdflow-backups.
2. Run `POSTGREST_URL=... POSTGREST_API_KEY=... node scripts/bdflow-restore.mjs <file>`
   with the values from the Vercel project settings. Rows are upserted, so it is safe to run on a database
   that still has data.
3. Uploaded files are under `backups/assets/` with their original names; upload them back to the Supabase
   storage bucket `webstudio-assets` if they were lost.

Published sites keep working during an outage: they are static files on Cloudflare.
