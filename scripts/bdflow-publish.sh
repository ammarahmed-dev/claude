#!/usr/bin/env bash
# Builds one published BD Flow site and deploys it to Cloudflare Pages (<SITE_NAME>.pages.dev).
#
# The editor runs this inside a short-lived Vercel Sandbox that holds a fresh
# clone of this repository. It reads everything it needs from the environment:
#   BUILD_ID, BUILDER_ORIGIN, SERVICE_TOKEN  load the published build
#   SITE_NAME                                Cloudflare Pages project to deploy to
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# When it finishes it reports PUBLISHED or FAILED back to the editor.
#
# PREPARE_ONLY=1 stops after installing the tools; the editor starts later
# publishes from a snapshot of such a sandbox to skip that time.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/fixtures/bdflow-site"

report() {
  # nothing to report to when preparing a sandbox
  if [ -z "${BUILDER_ORIGIN:-}" ]; then return; fi
  curl -sS -m 30 -X POST "$BUILDER_ORIGIN/rest/publish-status" \
    -H "Authorization: $SERVICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"buildId\":\"$BUILD_ID\",\"status\":\"$1\",\"sandbox\":\"${SANDBOX_NAME:-}\"}" || true
  echo
}
trap 'echo "publish failed at line $LINENO"; report FAILED' ERR

step() { echo "==> $1 ($(date +%T))"; }

step "install"
corepack enable --install-directory "$HOME/bin" >/dev/null 2>&1 || true
export PATH="$HOME/bin:$PATH"
cd "$ROOT"
# skip the install when a prepared snapshot already has these dependencies
LOCK_HASH="$(sha256sum pnpm-lock.yaml | cut -d' ' -f1)"
if [ "$(cat node_modules/.bdflow-lock-hash 2>/dev/null)" != "$LOCK_HASH" ]; then
  pnpm install --frozen-lockfile --filter 'ssg-cloudflare-pages...' >/tmp/install.log 2>&1 ||
    { tail -40 /tmp/install.log; false; }
  echo "$LOCK_HASH" >node_modules/.bdflow-lock-hash
fi
WRANGLER="$HOME/.bdflow-wrangler/node_modules/.bin/wrangler"
if [ ! -x "$WRANGLER" ]; then
  # installed outside the workspace, npx inside it cannot find the binary
  npm install --prefix "$HOME/.bdflow-wrangler" --no-save --no-audit --no-fund wrangler@4 \
    >/tmp/wrangler.log 2>&1 || { tail -20 /tmp/wrangler.log; false; }
fi
if [ "${PREPARE_ONLY:-}" = "1" ]; then
  trap - ERR
  step "prepared"
  exit 0
fi

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
CF_API="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects"
CF_AUTH="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
if [ "$(curl -sS -o /dev/null -w '%{http_code}' -H "$CF_AUTH" "$CF_API/$SITE_NAME")" != "200" ]; then
  curl -sS -f -X POST "$CF_API" -H "$CF_AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"$SITE_NAME\",\"production_branch\":\"main\"}" >/dev/null
fi
WRANGLER_SEND_METRICS=false "$WRANGLER" pages deploy dist/client \
  --project-name "$SITE_NAME" --branch main --commit-dirty=true

trap - ERR
report PUBLISHED
step "done"
