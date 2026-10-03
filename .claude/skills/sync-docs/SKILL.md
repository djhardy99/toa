---
name: sync-docs
description: Bring CLAUDE.md and docs/ back in line with the code. Use after changing code under apps/, when the docs-sync hook reports changed code without doc changes, or when `make docs-check` fails. Also use when asked to update, refresh or audit the docs or knowledge base.
---

# sync-docs

CLAUDE.md and `docs/` are the knowledge base for AI assistants working in this repo. They must stay correct: a stale doc is trusted and misleads.

## What belongs in them

Store what the code cannot tell you:
- decisions and the reason for them (`docs/design.md`)
- contracts and invariants (`docs/schemas.md`)
- gotchas, commands, conventions (`CLAUDE.md`)

Do not store what a reader can get by reading the code: function bodies, full file contents, anything easily derived. Link to a path instead of copying.

## Steps

1. Run `make docs-check`. Fix every mechanical problem it reports (missing paths, unreferenced docs, undefined make targets, broken links).
2. Find what changed: `git status --short` and `git diff` for `apps/`, `Makefile`, `scripts/`, `.claude/`.
3. Map changes to docs:
   - `apps/toa-engine/**`, `Makefile`: CLAUDE.md (toa-engine layout, Commands) and `docs/design.md` (engine call contract, implementation status).
   - `apps/toa-policy/**`: `docs/schemas.md` and CLAUDE.md.
   - A decision changed or was made: `docs/design.md`, with the reason and the alternative rejected. Remove or move anything it makes obsolete from Open questions.
   - A schema field, constraint or invariant changed: `docs/schemas.md`.
4. Read each affected doc section and the changed code. Edit only what is now wrong or missing. Keep the existing tone and structure.
5. Re-run `make docs-check`. It must print `docs-check: ok`.
6. Report in one or two lines what you updated, or "no doc change needed" and why.

## Rules

- Never describe something as built when it is not. Mark planned items "planned"; `docs-check` skips layout bullets that say so.
- Keep CLAUDE.md short. Detail goes in `docs/`.
- Do not commit.
