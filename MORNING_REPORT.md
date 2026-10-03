# Morning report

## Live

- Editor and dashboard: https://bdflow-studio.vercel.app (now rebranded to BD Flow; the login page title is "BD Flow login").
- Published demo site: https://cms-demo-site.ammar-d29.workers.dev
- Publish button: builds the site in a short-lived Vercel Sandbox (scripts/bdflow-publish.sh) and
  deploys it to Cloudflare Workers at `https://<site address>.ammar-d29.workers.dev`. The build was
  verified in a sandbox (about 40 s); the first full publish through the button is still unverified.

## Done overnight

- Visible Webstudio names, help/social links, promo banner, intro video, upgrade links, logo and favicon replaced.
  Internal package names and the AGPL license stay (see NOTICE.md).
- Dashboard wording: "Sites", "Create a blank site", "Create Site".
- New sites get their address from a pool of 29 pre-registered IDs (table `ProjectIdPool`, function
  `claim_project_id`). Each ID is already registered as `p-<id>-dot-bdflow-studio.vercel.app` on Vercel.
  Top up the pool before it runs out: insert UUIDs, then register each address on the Vercel project.
- Tests updated; the publish, dashboard, registry and project packages pass.

## Not done

- More CMS field types (Link, Email, Color, Image URL).
- A CMS panel in the left sidebar. The CMS is still reached through Assets.
- Real login. The live site still uses the temporary secret login. Rotate all credentials shared in chat.
- Not tested on the live site: creating a site end to end through the pool. I did not run it because
  an automated login on the live site was refused earlier and I did not work around that.

## Nothing deleted

No project was deleted on Vercel or GitHub.
