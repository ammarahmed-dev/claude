# BD Flow plan

Goal: an internal visual site builder with a CMS that has no field limits, working like Webflow
(Sites, Designer, CMS, Publish) and running on free tiers until the product is proven.

## Done

- Editor + dashboard live: https://bdflow-studio.vercel.app (Supabase database and storage, Vercel hosting).
- CMS: collections with Text, Number, Switch, Dropdown, Date fields; thousands of fields per collection.
- Published static sites on Cloudflare Workers (free).
- Webstudio branding removed from visible UI, titles, links, logo, favicon, promo banners.

## In progress / next

1. Webflow-style wording ("Sites", "New site") and a CMS panel in the left sidebar.
2. New sites on the Vercel address without a domain: pre-registered project address pool.
3. More field types: Link, Email, Color, Image URL.
4. Real login (GitHub) replacing the temporary secret login; rotate shared credentials.
5. Custom domain (aeocheck.co subdomain) when ready, removing the pool workaround.

## Rules

- Never delete projects on Vercel or GitHub accounts.
- Secrets stay out of the repo.
- Keep LICENSE and NOTICE.md (AGPL).
