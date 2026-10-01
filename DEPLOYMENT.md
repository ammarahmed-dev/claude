# Deployment plan (free tiers first)

Status: plan, 2026-10-01. The **publishing path was proven locally**; hosting the builder itself on
a free provider has **not been tried yet** (see "Not verified").

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

- **Node server.** The app is Remix with Prisma, so it cannot run on Cloudflare Workers. The repo
  ships a Vercel preset and `@remix-run/serve`, so a plain Node process (`remix-serve`) works too.
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

## Not verified

1. The production build of the builder (`remix vite:build`) and running it as a Node server.
2. The builder talking to Supabase's hosted Postgres, PostgREST and Storage instead of the local
   Docker stack, including running the Prisma migrations against it.
3. OAuth login in production.
4. Keeping Supabase awake (idea: a free scheduled GitHub Action that makes one request a week).
5. The GitHub Actions + Cloudflare Pages publishing workflow.
6. Per-entry pages (`entryPageId`) in a published site; only the list page was verified.

## Licence

Webstudio is AGPL-3.0. Running it for your own team is fine. If outside users ever use a modified
copy over the network, they must be offered the modified source.
