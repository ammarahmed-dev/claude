# Webflow parity

What exists in BD Flow compared with Webflow, and what is still missing.

| Area                                                                                                              | Webflow                | BD Flow                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Designer (visual editor, styles, breakpoints, components)                                                         | yes                    | yes (core of the editor)                                                                                |
| Pages, folders, page settings, SEO per page                                                                       | yes                    | yes                                                                                                     |
| CMS collections, items, dynamic pages and lists                                                                   | yes, with field limits | yes, no field limits. Fields: text, long text, slug, dropdown, date, email, link, color, number, switch |
| Assets and fonts                                                                                                  | yes                    | yes (Assets tab, custom fonts)                                                                          |
| Site settings: name, favicon, contact email, custom head code                                                     | yes                    | yes (Site settings → General)                                                                           |
| Redirects, response headers, password protection                                                                  | yes                    | yes                                                                                                     |
| Backups                                                                                                           | yes                    | yes (restore depends on the plan)                                                                       |
| Integrations: Google Analytics, Tag Manager, Plausible, Clarity, Meta Pixel, Search Console and Bing verification | yes                    | yes (Site settings → Integrations)                                                                      |
| Publish to a custom domain                                                                                        | yes                    | not yet. Needs a domain; static export to Cloudflare works today                                        |
| Forms with a submissions inbox and email notifications                                                            | yes                    | not yet                                                                                                 |
| Ecommerce                                                                                                         | yes                    | no                                                                                                      |
| Memberships / user accounts for site visitors                                                                     | yes                    | no                                                                                                      |
| Localization (multiple languages)                                                                                 | yes                    | no                                                                                                      |
| Interactions and animations                                                                                       | yes                    | partly (animation controls in the editor)                                                               |
| Third-party apps marketplace                                                                                      | yes                    | no                                                                                                      |
| Team workspaces and roles                                                                                         | yes                    | yes (workspaces, share links with view/edit permissions)                                                |

Integrations are written into the site's custom head code between `bdflow:` markers, so they
publish with the site and stay visible in the Custom code editor.
