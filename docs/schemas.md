# Schemas: toa-policy and toa-engine

Status: spec only. The TypeScript implementation (zod, in `apps/toa-policy/src/`) was removed on 2026-10-03 and was never committed. This document is the record of what it was, precise enough to rebuild it. Rationale for the decisions lives in `design.md`.

## Conventions

- **Ids** (policies, guardrails, datasets): lowercase kebab-case, `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **Versions**: positive integers.
- **Dates**: ISO dates, `YYYY-MM-DD`.
- A schema describes the authored or exported form. The engine consumes a published, immutable subset of it.

## Lifecycle fields

Shared by `PolicyVersion` and `GuardrailVersion`.

| Field | Type | Notes |
|---|---|---|
| `state` | `active` \| `deprecated` \| `retired` | Defaults to `active`. |
| `deprecatedOn` | date, optional | |
| `retiresOn` | date, optional | **Required when `state` is `deprecated`.** |
| `successor` | version, optional | The version callers should move to. |

## PolicyVersion

One immutable version of one measurable rule.

| Field | Type | Notes |
|---|---|---|
| `id` | id | Policy key, e.g. `no-secrets-leakage`. |
| `version` | version | |
| `name` | string, non-empty | |
| `description` | string, non-empty | |
| `judge.model` | string, non-empty | A **judge alias**. Endpoints and credentials live in the engine deployment, never in a policy. |
| `judge.prompt` | string, non-empty | |
| lifecycle fields | | See above. |

## GuardrailVersion

One immutable set of policy versions.

| Field | Type | Notes |
|---|---|---|
| `id` | id | e.g. `security`. |
| `version` | version | |
| `name` | string, non-empty | |
| `policies` | array of `{id, version}`, at least one | A policy id may appear **only once**. |
| lifecycle fields | | See above. |

## SplitConfig

One per policy. Which partitions the policy's dataset uses, as proportions that sum to 1 (within 1e-9).

| Field | Type | Notes |
|---|---|---|
| `test` | number, > 0 and <= 1 | Always present. |
| `train` | number, > 0 and < 1, optional | |
| `validation` | number, > 0 and < 1, optional | |

Valid: `{test: 1}`, `{train: 0.7, test: 0.3}`, `{train: 0.6, validation: 0.2, test: 0.2}`. Invalid: proportions not summing to 1, missing `test`, a zero proportion.

## DatasetRecord

| Field | Type | Notes |
|---|---|---|
| `id` | string | See [known issues](#known-issues): do not reuse the kebab-case id type. |
| `input` | string | |
| `expect` | `allow` \| `block` | The hand label. |
| `groupKey` | string, non-empty, optional | Set on variants of one adversarial attack so they share a split. Immutable after ingest. |
| `split` | `train` \| `validation` \| `test` | Assigned once at ingest and stored. Never recomputed. |

## Dataset

The labeled records for one policy plus its split config. Used as the export and import format.

| Field | Type |
|---|---|
| `id` | id |
| `policy` | id |
| `split` | SplitConfig |
| `records` | array of DatasetRecord (may be empty) |

Invariants:
- Record ids are unique within a dataset.
- All records sharing a `groupKey` have the same `split`.
- A record's stored `split` is **not** required to be among the partitions in the current `SplitConfig`. After a config change, old records keep their original split.

## Split assignment

Run once when a record is ingested. The result is stored on the record.

1. `splitKey` = the record's `groupKey` if it has one, otherwise its `id`.
2. **Group inheritance:** if the record has a `groupKey` and the dataset already has a record with that `groupKey`, use that record's stored `split` and stop. (The cutoffs may have changed since the first variant arrived.)
3. `digest` = SHA-256 of the UTF-8 string `<policy id>` + a NUL byte (`\0`) + `<splitKey>`.
4. `f` = the first 6 bytes of `digest` read as a big-endian unsigned integer, divided by 2^48. This gives a float in [0, 1).
5. Walk the partitions in the order train, validation, test, skipping any not in the config. Keep a running cutoff that adds each partition's proportion. The record gets the first partition whose cutoff is greater than `f`. If none matches (floating-point error at the top edge), use `test`.

Properties that must hold:
- Deterministic: the same policy id and split key always give the same `f`.
- Different policies give different `f` for the same record.
- Over many records, assigned proportions are close to the config (10,000 ids landed within 3 points of a 0.7 target).
- Variants with one group key land in the same split.
- A new variant inherits its group's stored split even if the config changed (for example to test-only).
- A record without a group key ignores existing groups.
- Test records never move. Adding a validation partition later is an explicit action that carves records out of train only.

## Contract with the engine

The engine does not read datasets. It consumes published artifacts built from:
- `GuardrailVersion`, which expands to `PolicyVersion`s (judge alias, prompt, lifecycle state and dates).
- Lifecycle state and dates, carried in the artifact manifest, so the engine can enforce retirement itself.
- The artifact carries its own schema version, and the engine declares which it accepts.

The Go side has no schema code yet. When it does, derive both sides from one definition (for example JSON Schema generated from the TypeScript schemas) so they cannot drift.

## Tests that existed

Table-driven, using `node:test`. Worth reproducing:
- **PolicyVersion:** valid, version zero, empty judge prompt, deprecated without `retiresOn`, deprecated with date and successor, bad date, retired, default state is `active`.
- **GuardrailVersion:** valid, no policies, duplicate policy, bad id.
- **SplitConfig:** train and test, train and validation and test, test only, not summing to 1, no test, zero proportion.
- **Dataset:** valid, empty, bad `expect`, bad split, duplicate record id, group within one split, group spanning splits.
- **Split:** float determinism and range, different policy gives different float, `pickSplit` boundaries (zero, just below a cutoff, at a cutoff, top edge, validation band, test only, no train), proportions near the config, group variants share a split, group inheritance after a config change, ungrouped records ignore groups.

## Known issues

Found in review of the removed code. Fix them in any rebuild.

1. **Record ids were too strict.** `DatasetRecord.id` reused the kebab-case id type. Real ids (UUIDs, S3 keys, uppercase, underscores, dots) would be rejected at ingestion. Use a non-empty string with a length limit.
2. **`@types/node` was version 26 while the runtime was Node 22.2.** Pin the types to the runtime's major version and add an `engines` field.
3. **Stale compiled output could run as tests.** `tsc` never deletes old files, so a renamed or deleted test could still run from `dist/`. Delete `dist` before building.
4. **Group lookup was a linear scan.** In the database, index (policy, group key).
5. **Concurrent first ingests of one group** could pick different splits if the cutoffs changed between them. Store the group's split under a unique constraint on (policy, group key).
