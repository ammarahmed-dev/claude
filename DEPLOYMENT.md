# Deployment plan (free tiers first)

Status: plan, 2026-10-01. The **publishing path was proven locally**; hosting the builder itself on
a free provider has **not been tried yet** (see "Not verified").

## The published site is live (2026-10-01)

**https://cms-demo-site.ammar-d29.workers.dev** serves the static site built from the demo project
(three CMS entries, newest first). Checked from the internet: HTTP 200, the three headings, and the
stylesheet loads.

How it was deployed, so it can be repeated after every change:

```sh
# 1. pull the latest project and build the static site (see "Published sites" above)
webstudio sync && webstudio build --template ssg && pnpm build        # -> dist/client
# 2. serve that folder as a Worker with static assets
#    wrangler.jsonc:  { "name": "cms-demo-site", "compatibility_date": "2026-10-01",
#                       "assets": { "directory": "./public" } }      # public/ = copy of dist/client
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... wrangler deploy
```

Notes:

- Cloudflare has merged Pages into Workers. `wrangler pages deploy` now delegates to `wrangler deploy`
  and fails without a Worker entry point, so deploy the folder as a Worker with static assets instead.
  The API token needs **Account -> Workers Scripts -> Edit** (a Pages-only token is not enough).
- The Worker name is the only thing in the Cloudflare account this project owns; an unrelated Worker
  (`storage-worker`) already existed and was left untouched.
- The upload includes the CMS source files under `/assets` (collection definition and entry files).
  They are public. Do not put private content in a collection that is published this way.

## The editor is live on Vercel (2026-10-01)

**https://bdflow-studio.vercel.app** serves the dashboard and editor. It is the same build the project
was designed for (the Vercel preset), running against the Supabase database and storage described
above. Vercel project `bdflow-studio` (Hobby plan, Seoul region), linked to this repository and branch.

How it is configured:

- Root directory `apps/builder`; install and build commands run from the repository root (see the
  project settings); Node 22; framework Remix.
- Environment variables (production and preview): `POSTGREST_URL`, `POSTGREST_API_KEY` (service role,
  stored as a sensitive value), `S3_*`, `AUTH_SECRET` (sensitive), `DEV_LOGIN=true`,
  `PUBLIC_SINGLE_LEVEL_PROJECT_HOSTS=true`, `DEFAULT_PLAN_FEATURES`.
- Vercel's own login wall is off for the project, so the app is public and protected only by its
  secret login. Replace it with GitHub login before real use.

Project editors open at `p-<project-id>-dot-bdflow-studio.vercel.app`. Vercel allows aliasing any free
`*.vercel.app` name to a deployment but has no wildcard for them, so **each new project's editor
address must be registered once** (`assign_alias` for the host above). Until a domain with wildcard
subdomains exists, a project created in the dashboard shows a Vercel 404 at its editor address until
that alias is added. Look the id up with: `select id, title from "Project"` in the Supabase project.

Limits and caveats:

- Vercel Hobby is for personal, non-commercial use. Move to Pro or another host before commercial use.
- Redeploy after changes with the Vercel connector (`create_deployment` from this branch), then check
  the alias list; the short alias `bdflow-studio.vercel.app` must stay attached (the one-level project
  host has a 63-character label limit).

## Where we stopped (2026-10-01) and what blocks going live

**Paused on purpose until a domain exists.** The platform is built and verified locally; the database
and file storage are live on Supabase; only the editor itself is not hosted anywhere public.

Why the editor cannot just go live on a generated address:

1. **It needs wildcard subdomains.** Each project opens at `p-<project-id>.<host>` (or
   `p-<project-id>-dot-<host>`), and the dashboard, project editor and preview canvas are told apart by
   hostname. Generated addresses such as `*.onrender.com` or `*.trycloudflare.com` cannot create
   those subdomains. Roughly 70 call sites rely on this, and the separation is also a security
   boundary (the canvas can run custom code and must not share an origin with the dashboard session).
   A "single address" mode is therefore a multi-day refactor, not a quick change. Not started.
2. **Render requires a payment card** even for its free plan (API answers 402). Not used.
3. **Cloudflare Tunnel needs the domain's DNS on Cloudflare.** `aeocheck.co` stays on Namecheap
   because a Vercel project uses it, so it cannot move. Running `cloudflared` from the cloud sandbox
   also needs an explicit permission rule, and the tunnel's outbound port was never tested.

Decision: wait for a domain. Cheapest route that keeps everything else intact:

1. Buy any inexpensive domain (about $1-3 for a `.xyz`/`.site`) and add it to a free Cloudflare
   account; point its nameservers at Cloudflare.
2. Create an API token with Account -> Cloudflare Tunnel: Edit, Zone -> DNS: Edit, Zone -> Zone: Read.
3. Build with `PUBLIC_SINGLE_LEVEL_PROJECT_HOSTS=true BUILDER_TARGET=node` (both already supported) so
   project hosts are `p-<id>-dot-studio.<domain>`, one level below the zone and covered by Cloudflare's
   free `*.<domain>` certificate.
4. Create the tunnel with ingress for `*.<domain>`, a `studio` CNAME and a wildcard CNAME to it; run the
   editor against Supabase (HTTPS only; the running editor never opens a direct database connection)
   and start `cloudflared`.
5. Replace the temporary secret login with GitHub login or Cloudflare Access before real use.

For a permanent setup the editor still needs an always-on machine; a Docker image plus compose file with
the tunnel is the planned packaging.

Credentials used so far (Supabase access token and database password, storage keys) were shared in chat
and must be rotated after development. Nothing secret is stored in this repository.

## Two things to host

| Part                       | What it is                      | Needs                                                                    |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| **The platform** (builder) | The editor + CMS your team uses | Always-on Node server, Postgres, PostgREST, S3-style file storage, login |
| **Published sites**        | The websites you build with it  | Static hosting only                                                      |

Keeping them separate is what makes free hosting realistic: the platform serves a handful of
editors, while public traffic only ever hits static files.

## Published sites: free, and proven

The editor's Publish button targets `*.wstd.work`, which is **Webstudio's own hosted publisher**
(`TRPC_SERVER_URL`). A self-hosted platform does not have it, so publishing goes through the CLI:

```sh
webstudio link --link "<share link with Builder permission>"   # once per site
webstudio sync                                                 # pulls pages + CMS entries
webstudio build --template ssg                                 # static site (Vike)
pnpm build                                                     # -> dist/client (plain HTML)
```

Verified on 2026-10-01 against the local `posts` collection: the generated `index.html` contained
the three CMS entries, in `publishedOn` descending order, as `<h1>` elements. `dist/client` can be
uploaded to any static host. Other templates exist (`react-router-cloudflare`, `docker`, `netlify`,
`vercel`, ...); use them if a site needs server rendering.

Notes from doing it:

- With a locally built CLI the generated `package.json` pins `@webstudio-is/*` to the placeholder
  `0.0.0-webstudio-version`. A released CLI substitutes a real version. For this fork, either use the
  published CLI, or generate into a workspace folder and replace the placeholder with `workspace:*`.
- Share links need the **Builder** permission for the CLI to fetch a buildable project.

### Hosting for published sites

Cloudflare Pages free plan (per third-party summaries; confirm on Cloudflare's pricing page):
unlimited static bandwidth, 500 builds/month, up to 100 sites, 100 custom domains per project.
GitHub Pages is a fallback. Do **not** use Vercel Hobby: it is for non-commercial use only.

Suggested automation (untested): a GitHub Actions workflow per site that runs the four commands
above on a schedule or on demand, then deploys `dist/client` with `wrangler pages deploy`. Store the
share link and Cloudflare token as encrypted secrets.

## The platform: what it needs

From `apps/builder/app/env/env.server.ts` and the dev stack:

- **Node server.** The app is Remix with Prisma, so it cannot run on Cloudflare Workers. It builds as a
  plain Node process with `BUILDER_TARGET=node` (see below).
- **Postgres + PostgREST.** Local dev runs the Supabase Postgres image plus `postgrest`. Supabase
  provides both, plus S3-compatible storage, which is why it is the natural fit.
- **Storage** for uploaded assets and CMS entries: `S3_*` variables (otherwise local disk).
- **Login:** GitHub and/or Google OAuth apps (free to create). The "Login with Secret" form
  (`DEV_LOGIN`, `AUTH_SECRET`) is for local development only.
- **Plan features:** `DEFAULT_PLAN_FEATURES` (already set in `apps/builder/.env`) removes the hosted
  paywall and the 50-asset cap.

### Free-tier options

| Need                      | Option                          | Limits to know (third-party summaries, mid-2026)                                                                                                 |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Database + REST + storage | **Supabase free**               | 500 MB database, 1 GB storage, 5 GB egress; **projects pause after 1 week of inactivity** and must be restored manually                          |
| Node server               | **Render free**                 | Sleeps after 15 min idle (about 1 min to wake), 750 instance hours/month; Render's docs say not to use free instances for production             |
| Node server (alternative) | **Oracle Cloud Always Free** VM | Reported cut in 2026 from 4 OCPU/24 GB to 2 OCPU/12 GB, done without notice; signup can be difficult. Runs the whole stack with `docker compose` |
| Published sites           | **Cloudflare Pages**            | see above                                                                                                                                        |

Sources: [Supabase limits](https://automationatlas.io/answers/supabase-free-tier-limits-2026/),
[Render free tier](https://render.com/docs/free),
[Cloudflare Pages limits](https://temps.sh/blog/cloudflare-pages-free-tier-limits-2026),
[Oracle Always Free change](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/).

### Recommendation

To **prove the platform**: Supabase free + the builder on Render free + sites on Cloudflare Pages.
Cost is $0. Expect a slow first load after idle and a paused database if nobody logs in for a week.

When the platform is proven and used daily, the first things worth paying for are the always-on
parts, in this order: the Node host, then the database (Supabase Pro is about $25/month). Static
sites stay free.

## Running the platform as a plain Node server (verified)

The default build targets Vercel's serverless layout, which `pnpm start` cannot run. This fork adds an
opt-out so the same code builds for Render, Docker or a VPS:

```sh
cd apps/builder
BUILDER_TARGET=node pnpm build     # produces build/server/index.js
set -a; source .env; set +a        # or set the same variables in the host's dashboard
NODE_ENV=production PORT=3000 pnpm start
```

Verified on 2026-10-01 against the local Docker Postgres/PostgREST: the production build completes
(about 35 s) and the server starts and serves the login page. The default build (without
`BUILDER_TARGET`) is unchanged.

## Supabase project status (2026-10-01)

Project `BD-Flow` (ref `tjtuyoonedogrwdqqimm`, region ap-northeast-2, Postgres 17). No secrets are
stored in this repository; the access token and database password are supplied through the
environment.

Done and verified:

- The Webstudio schema (19 tables, views, functions) is applied, and all 155 Prisma migrations are
  recorded in `_prisma_migrations`, so a later `migrations migrate` run starts from the right place.
- Every table has row-level security on and `anon`/`authenticated` have no grants. Checked through
  the public REST address: the `anon` key gets "permission denied" on `Project` and `User`, and
  the `service_role` key can read them.
- The builder must use the `service_role` key server-side only. Never put it in browser code.

Method, because raw Postgres connections (ports 5432/6543) are blocked from the sandbox: the schema
was exported from the local Docker database (`pg_dump --schema=public --schema-only`), the line
`CREATE SCHEMA public;` was removed, and the SQL was applied through the Supabase Management API
(`POST /v1/projects/{ref}/database/query`). From a normal machine or a Render build step, run
`pnpm --filter @webstudio-is/prisma-client migrations migrate --cwd ../../apps/builder` instead.

File storage (done and verified):

- A private bucket `webstudio-assets` exists. The builder reads and writes it with signed S3 requests,
  so nothing in it is public.
- Environment for the builder (the two keys are created in the Supabase dashboard under Project
  Settings -> Storage -> S3 Connection and must stay out of the repository):

  ```
  S3_ENDPOINT=https://tjtuyoonedogrwdqqimm.supabase.co/storage/v1/s3
  S3_REGION=ap-northeast-2
  S3_BUCKET=webstudio-assets
  S3_ACCESS_KEY_ID=...        # secret
  S3_SECRET_ACCESS_KEY=...    # secret
  ```

  Leave `S3_ACL` unset: Supabase does not support ACLs, and the uploader only sends one when set.

- Fix needed for this: `createS3ObjectUrl` resolved `/<bucket>/<key>` against the endpoint, which
  silently dropped the `/storage/v1/s3` prefix. It now keeps the endpoint's path. Endpoints without a
  path behave as before. Covered by tests in `object-url.test.ts`.
- Verified by uploading a file through the repository's own `createS3AssetObjectStore` and reading it
  back identically; the test object was deleted afterwards.

## Dependence on Webstudio-hosted services

Audited 2026-10-01 by searching the source and the generated site.

- **No scripts or CDN assets are loaded from webstudio.is** by the editor or by published sites. No
  analytics, tracking or third-party script tags were found, and the generated site has none.
- **Published sites** ship their own JavaScript and downloaded assets. Their only npm dependencies are
  the `@webstudio-is/*` packages, which come from this repository (`workspace:*`), not from a CDN.
- **Branding link:** the built-in 404 page template contains a "Built with Webstudio" badge linking to
  webstudio.is (`packages/sdk-components-registry/src/core-templates.tsx`). It is a plain link, but it
  is their brand on your pages; remove it before launch.
- **Hosted publisher:** the Publish button targets `*.wstd.work` through `TRPC_SERVER_URL`. Without that
  service it cannot publish; use the CLI pipeline above.
- **Links in the editor** (docs, pricing, template gallery, a promo banner, and a welcome video embedded
  from YouTube) point at webstudio.is, wstd.us and youtube-nocookie.com. They only matter if clicked,
  except the video, which loads from YouTube on the dashboard welcome screen.
- **Not used unless configured:** `RESIZE_ORIGIN` (image/video resizing), `ENTRI_*` (custom domains).

## Not verified

1. A full production login and editing session. The server serves pages, but logging in behind HTTPS
   (cookies, `DEPLOYMENT_URL`, OAuth callback URLs) was not exercised.
2. The builder talking to Supabase's hosted Postgres, PostgREST and Storage instead of the local
   Docker stack, including running the Prisma migrations against it.
3. OAuth login in production.
4. Keeping Supabase awake (idea: a free scheduled GitHub Action that makes one request a week).
5. The GitHub Actions + Cloudflare Pages publishing workflow.
6. Per-entry pages (`entryPageId`) in a published site; only the list page was verified.

## Licence

Webstudio is AGPL-3.0. Running it for your own team is fine. If outside users ever use a modified
copy over the network, they must be offered the modified source.
