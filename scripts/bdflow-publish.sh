#!/usr/bin/env bash
# Builds one published BD Flow site and deploys it to Cloudflare Workers.
#
# The editor runs this inside a short-lived Vercel Sandbox that holds a fresh
# clone of this repository. It reads everything it needs from the environment:
#   BUILD_ID, BUILDER_ORIGIN, SERVICE_TOKEN  load the published build
#   WORKER_NAME                              Cloudflare Worker to deploy to
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# When it finishes it reports PUBLISHED or FAILED back to the editor.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/fixtures/bdflow-site"

report() {
  curl -sS -m 30 -X POST "$BUILDER_ORIGIN/rest/publish-status" \
    -H "Authorization: $SERVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"buildId\":\"$BUILD_ID\",\"status\":\"$1\"}" || true
  echo
}
trap 'echo "publish failed at line $LINENO"; report FAILED' ERR

step() { echo "==> $1 ($(date +%T))"; }

step "install"
corepack enable --install-directory "$HOME/bin" >/dev/null 2>&1 || true
export PATH="$HOME/bin:$PATH"
cd "$ROOT"
pnpm install --frozen-lockfile --filter 'ssg-cloudflare-pages...' >/tmp/install.log 2>&1 ||
  { tail -40 /tmp/install.log; false; }

step "prepare site"
rm -rf "$SITE"
cp -a "$ROOT/fixtures/ssg-cloudflare-pages" "$SITE"
cd "$SITE"
rm -rf .webstudio/data.json .webstudio/assets app pages dist public/assets

step "load build"
node ../../packages/cli/local.js sync \
  --buildId "$BUILD_ID" --origin "$BUILDER_ORIGIN" --authToken "$SERVICE_TOKEN"

step "generate pages"
node ../../packages/cli/local.js build --template ssg

step "build"
# compile the workspace packages from source, they have no prebuilt output here
export WEBSTUDIO_LOCAL_CLI_BOOTSTRAPPED=1
pnpm exec vite build >/tmp/vite.log 2>&1 || { tail -60 /tmp/vite.log; false; }
pnpm exec vike prerender >>/tmp/vite.log 2>&1 || { tail -60 /tmp/vite.log; false; }

step "deploy"
NOT_FOUND='"none"'
if [ -f dist/client/404.html ]; then NOT_FOUND='"404-page"'; fi
cat >wrangler.jsonc <<EOF
{
  "name": "$WORKER_NAME",
  "compatibility_date": "2026-10-01",
  "workers_dev": true,
  "assets": { "directory": "./dist/client", "not_found_handling": $NOT_FOUND }
}
EOF
WRANGLER_SEND_METRICS=false npx --yes wrangler@4 deploy

trap - ERR
report PUBLISHED
step "done"
