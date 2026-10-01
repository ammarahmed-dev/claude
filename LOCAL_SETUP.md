# Running the builder locally (verified 2026-10-01)

Requirements: Node 22, pnpm 9+, Docker (the daemon must be running).

```sh
pnpm install --frozen-lockfile
pnpm --filter=@webstudio-is/prisma-client generate          # must run BEFORE `pnpm dev` the first time
pnpm -r --filter='!./fixtures/*' --filter='!@webstudio-is/builder' build   # Vite config needs built packages/*/lib
pnpm dev                                                    # starts Postgres + PostgREST in Docker, then the builder
```

Open **https://wstd.dev:5173/** (not `localhost`). `DEV_LOGIN=true` in `apps/builder/.env`
enables the local dev login, so no GitHub app is needed.

Tip: if `curl` is used inside a sandbox with a proxy, pass `--noproxy '*'`.

## Run the production build on localhost (verified 2026-10-01)

The same thing a server would run, instead of the dev server. Needs Node 22, pnpm 9 and Docker.

```sh
pnpm install --frozen-lockfile
pnpm --filter=@webstudio-is/prisma-client generate
pnpm -r --filter='!./fixtures/*' --filter='!@webstudio-is/builder' build

# 1. database + REST layer in Docker (first run applies all migrations, then exits and leaves them running)
LOCAL_DEV_START_BUILDER=false pnpm dev

# 2. production build of the editor, served over https
cd apps/builder
BUILDER_TARGET=node pnpm build
node scripts/serve-https.mjs            # https://wstd.dev:5174
```

Open **https://wstd.dev:5174/** and choose **Login with Secret**: the secret is `AUTH_SECRET` from
`apps/builder/.env` (`0000` by default, local use only) and any email address. `wstd.dev` and
`p-<project-id>.wstd.dev` resolve to 127.0.0.1 through public DNS, and `https/` ships a trusted
certificate for `*.wstd.dev` (valid until 2026-11-26; pull the repository for a renewed one).

Verified: a fresh browser logs in, the dashboard lists the project, and the editor opens with the CMS
entries rendered on the canvas, about 10 seconds from first request to a rendered page.

If the editor cannot call itself (login loops back), start it with `NODE_TLS_REJECT_UNAUTHORIZED=0`;
the server fetches its own `wstd.dev` address during sign-in.

## Gotchas

- First page loads are slow (Vite compiles on demand) and may reload once ("Re-optimizing dependencies").
  Wait for the editor rather than assuming it is broken.
- The Docker daemon must stay running for the whole session; if `docker ps` fails, start `dockerd` again
  and restart `pnpm dev`.
- Component tests need a Chromium that matches the pinned Playwright. In a sandbox, point
  `PLAYWRIGHT_BROWSERS_PATH` at a folder whose `chromium-1155` and `chromium_headless_shell-1155` are
  symlinks to the installed browsers.
