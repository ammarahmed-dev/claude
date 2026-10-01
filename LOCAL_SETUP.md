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
