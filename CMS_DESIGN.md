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
