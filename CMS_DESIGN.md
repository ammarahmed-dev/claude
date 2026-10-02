# CMS design: beating Webflow's field limits

Status: draft, 2026-10-01. Based on reading the forked Webstudio source (commit 8e4c080).

## Finding: Webstudio already has content collections

`packages/content-engine` plus the Asset Manager UI
(`apps/builder/app/builder/shared/asset-manager/collection-*-dialog.tsx`) implement a
file-based CMS:

- A **collection** is a folder in the project's assets with a `collection.json` (JSON Schema
  for the fields) and a `template.mdx`.
- **Entries** are `*.mdx` / JSON documents. Fields live in frontmatter.
- The content engine compiles entries into a query database; pages query it through a
  Resource. Entry pages are generated from `entryPageId`.

### What it already does better than Webflow

- Fields are plain JSON Schema, not a fixed-size table, so there is no per-collection field
  cap tied to a pricing plan.
- Content is portable files (Markdown/JSON) with `$ref` references between documents.

### Hard limits in the code (`packages/content-engine/src/limits.ts`)

| Limit                                                   | Value  | Notes                                        |
| ------------------------------------------------------- | ------ | -------------------------------------------- |
| fields per document (`frontmatterFields`, `jsonFields`) | 256    | constant, we can raise it                    |
| compiled database size (`databaseBytes`)                | 500 KB | overridable via `CONTENT_DATABASE_MAX_BYTES` |
| candidate documents per query                           | 1000   | constant                                     |
| results per query                                       | 1000   | constant                                     |
| document nesting depth                                  | 8      | constant                                     |

### Gaps versus Webflow's CMS

Originally field types were only `string | number | integer | boolean`. Progress:

| Webflow field                         | Status                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Plain text, long text, number, switch | built in                                                               |
| Option (dropdown)                     | **done**: string + `enum` (up to 256 options), `select` control        |
| Date                                  | **done**: string + `format: "date"`, validated as a real calendar date |
| Email                                 | **done**: string + `format: "email"`                                   |
| Link (also use for image URLs)        | **done**: string + `format: "uri"`, absolute URL required              |
| Color                                 | **done**: string + custom `format: "color"`, `#RRGGBB`                 |
| Rich text                             | todo (entry body is already MDX; needs a field-level editor)           |
| Image / file                          | todo                                                                   |
| Color, link                           | todo                                                                   |
| Reference / multi-reference           | todo (engine already supports `$ref` between documents)                |

## Decision

1. **Phase A (now): extend the native collections.** Add the missing field types and raise
   the limits. This stays close to upstream, so merging future Webstudio releases stays
   cheap, and it is the fastest path to "no field limit".
2. **Phase B (only if limits bite): Postgres-backed store.** If we need tens of thousands of
   items or relational queries, add an items table behind the same query interface. Not
   needed to prove the platform.

## Phase A work items

1. Verify the collection flow end to end in the running editor (create collection, add
   entries, bind a list on a page).
2. ~~Raise `frontmatterFields`/`jsonFields`~~ done (256 -> 2048). Still to do: set `CONTENT_DATABASE_MAX_BYTES` for real content volumes.
3. Add field types in `content-collection.ts` (`CollectionField`) and the field editor UI:
   date and option are done; image, rich text, color, link and references remain.
4. Tests for each new type (the package already has a large vitest suite).
5. Document how a non-developer creates a collection.

## Risks

- AGPL: modified source must be offered to outside users if we expose this as a service.
- Upstream churn: the content engine is new and moving fast; keep our changes in small,
  separate commits.

## Verified end to end (2026-10-01)

Everything below was done by hand in the running editor, not just in unit tests:

1. Created a `posts` collection folder (Assets panel -> Create folder -> "Use as content collection").
2. In Collection settings, added a **Category** Dropdown (news / guide / release) and a **Published on** Date field.
3. Created three entries with "New entry"; the form showed the dropdown and a date input. Stored
   frontmatter is plain YAML (`category: news`, `publishedOn: 2026-10-01`); dates stay strings
   because the engine parses YAML with the `core` schema.
4. Queried them over `/rest/assets/query`: sorted by `publishedOn` desc, filtered by
   `category = guide` (1 result) and by `publishedOn >= 2026-10-05` (2 results).
5. On a page, added a System resource variable `posts` (Resource: Assets) with filter
   `extension = mdx`, sort `properties / publishedOn` desc, output the CMS fields; added a
   **Collection** component bound to `posts.data` and a **Heading** inside it bound to
   `collectionItem.properties.title`. The canvas rendered the three titles in date order.

Not verified yet: per-entry pages (`entryPageId`), publishing the site, image/rich text/reference fields.

## Plan gating is removed for this fork

Hosted Webstudio gates features by plan. The free plan locks resources (dynamic data) and allows only
**50 assets per project**, which would also cap CMS entries, because entries are assets.

`DEFAULT_PLAN_FEATURES` (JSON, in `apps/builder/.env`) overrides the baseline plan every account starts
from. This fork sets every feature on and `maxAssetsPerProject` to 100000. Unknown keys or wrong types
make the whole override invalid and the built-in free plan is used, with an error logged. The code lives
in `packages/plans/src/plan-features.ts` (`resolveDefaultPlanFeatures`) and is covered by tests.

## Editor tips learned while driving the UI

- Binding a prop: select the element -> Settings -> hover the prop -> click the small blue dot -> type
  the expression -> click the popover title to commit (Escape discards it).
- The query editor's Query tab is editable code; pasting the whole expression is faster than the form
  and avoids the quote-autoclosing of the small value boxes.
- "All content fields" in the Output menu returns every field, so adding a CMS field never needs a
  query edit.
