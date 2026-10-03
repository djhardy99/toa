# Toa system design (v1 draft)

Status: draft, last updated 2026-10-03. Decisions are recorded as decided; anything unresolved is under [Open questions](#open-questions). What is built so far is under [Implementation status](#implementation-status).

## Components

- **toa-engine** (Go): executes guardrails in production. Returns verdicts.
- **toa-policy** (TypeScript full-stack): web app where people author policies, build challenge datasets, label cases, and measure the impact of guardrails on customer projects.
- **Data ingestor**: a module inside toa-policy (own code and tables, same deployment). It is the only write path for records that people input (challenge cases and their labels). toa-policy holds no other customer data.
- All are deployed **self-hosted, per customer** (single-tenant installs).

```
 authors ──> toa-policy web app + API ──> Postgres
                     │                     (policies, versions, datasets, labels,
                     │                      runs, results, audit, job queue)
                     ├─ worker ──> dev engine (same build as prod, draft mode)
                     │                └─> judge LLM (customer-configured)
                     ├─ connectors ──> customer S3 / DB (read-only, read-through)
                     └─ publish ──> artifact store (signed) ──> prod engine
```

## Concepts

- **Policy**: one measurable rule (e.g. `no-secrets-leakage`). Holds the judge prompt and a named judge model (an alias). Credentials and endpoints are never part of a policy.
- **Guardrail**: a set of policies (e.g. `security` = no data leakage + no secrets leakage + no system prompt leakage).
- **Dataset**: the labeled records for one policy, plus its split config. A **record** has an `input`, an `expect` of `allow` or `block`, an optional group key, and a stored split (`train`, `validation` or `test`).
- **Project**: a customer's LLM app. Representative data is run against a project to see a guardrail's impact.
- **Binding**: pins a guardrail version to a project in an environment (dev or prod). Many-to-many between guardrails and projects.
- **Validator**: a published, immutable policy version as the engine runs it. "Policy" is the authored thing, "validator" is what a caller invokes.

## Decisions

### Deployment and identity
- Self-hosted per customer. Ship containers and migrations. No telemetry to us.
- Judge endpoint is customer-configured (hosted API, cloud provider, or self-hosted model) so air-gapped installs work.
- Auth: customer IdP via OIDC **and** a break-glass local admin, from day one. RBAC roles (author, publisher, viewer, admin).
- Stack: TypeScript full-stack. zod schemas are shared between UI and API.

### Storage
- Postgres is the source of truth. It is also the job queue (`SELECT ... FOR UPDATE SKIP LOCKED`), so there is no second datastore to run.
- Versioning is append-only and immutable, with a content hash per version.
- An audit log records who changed what.

### Versioning (three levels)
1. **Policy version**: immutable.
2. **Guardrail version**: an immutable set of policy versions. Publishing a policy never silently changes an existing guardrail.
3. **Binding**: guardrail version pinned to a project and environment. Promotion is explicit, and binding history is kept.

The key report is the **candidate guardrail version vs the currently pinned one, on this project's data**.

### Version lifecycle
Like a deprecated function: still works, announces its removal, then goes away.

| State | Behavior |
|---|---|
| `active` | Normal. |
| `deprecated` | Still evaluates. The response includes a warning with the successor and the planned retirement date. |
| `retired` | Refused with 400 `version_retired`. |

- Warning shape, in the response body next to the verdicts: `{"code": "version_deprecated", "guardrail": "security", "version": 1, "successor": 2, "retires": "2026-12-01"}`. The standard `Sunset` HTTP header can carry the date too.
- Retirement is a date, not a release number. Guardrail versions are not releases of the engine, so "removed in version X" is expressed as a date plus a named successor.
- **Roadmap view** in toa-policy: every guardrail version with its state, deprecation date, retirement date, successor, and usage. Changes are permissioned and audit-logged.
- The engine enforces the retirement date from the manifest by itself, so retirement does not depend on a push. An early retirement (for a buggy or unsafe version) is a new manifest that sets the state to `retired` immediately.
- A minimum notice period between deprecation and retirement, with a separate permission to override it for urgent cases.
- Usage per version needs caller identity (API key per project). Without it the roadmap cannot say who is still calling a version.

### Publishing
- No approval step in v1. Authors with the publisher permission can publish.
- Publish and promote are separate steps, and promotion is its own permission.
- Publishing writes a **signed, versioned artifact** to an artifact store. The prod engine reads from the store. It verifies the signature, loads atomically via a manifest pointer, and keeps a last-known-good copy. Rollback moves the pointer.
- Artifacts carry a schema version. The engine declares which versions it accepts (customers upgrade at different times).
- Publish-time compatibility check: the engine advertises its available judges, and an artifact naming a missing judge is refused.

### Evaluation
- Evals run through a **dev engine instance** linked to toa-policy. It is the same code as prod but a separate instance.
- The dev engine has a gated mode that accepts draft policy versions per request. This mode must never exist in the prod build or config, and it requires authentication.
- Each request names the policy version it wants, so concurrent authors do not collide through global state.
- Every result records: policy version, guardrail version, the records and splits used, engine version or image digest, and settings. The judge model and prompt are part of the policy version.
- Evals are long-running jobs, not requests. They need queueing, cost and rate budgets, cancellation, and idempotency.
- Results can be cached by (policy version, case hash, judge config).

### Engine failure contract
- "Blocked" is a normal 200 with a verdict.
- "Could not evaluate" (judge timeout or down) is an upstream error (504 or 503) with the failing policy and `Retry-After`. Consumers decide whether to fail open or closed.
- Fast mode and complete mode are described under the call contract below.
- Use deadlines and a circuit breaker so a slow judge does not tie up connections.

### Engine call contract
Request: a list of guardrails, each with an immutable version.

```json
{ "guardrails": [{"guardrail": "pii", "version": 2}, {"guardrail": "security", "version": 1}], "input": "..." }
```

- The engine expands each guardrail version into its validators (the immutable set of policy versions). It holds multiple versions at once and loads them from verified artifacts. An unknown or unpublished version is a 4xx, distinct from a 5xx evaluation failure.
- **Any block wins** across all validators of all requested guardrails.
- The response lists, per guardrail, every validator that ran: id and version, judge alias, outcome (`blocked | allowed | error | skipped`), latency. The policies hit are the validators with outcome `blocked`.
- **Fast mode** (prod default): return as soon as one validator blocks. The rest are `skipped`. **Complete mode** (dev engine and evals): wait for all validators so the result is full.
- Judge reasoning and prompts are not returned to prod consumers (callers could use them to tune attacks). They are available only in authenticated dev or eval mode.
- If nothing blocked and any validator errored, return 5xx with the per-validator results in the body.
- **Version lifecycle** applies to every guardrail version (see Version lifecycle). A **deprecated** version still evaluates, and the response carries a warning. A **retired** version is refused with **400** and the code `version_retired`, the guardrail and version, and the suggested successor.
- All requested versions are checked before any judge runs. If any one is retired or unknown, the whole request is rejected. Evaluating only the rest would silently drop a guardrail.
- Lifecycle state and dates travel in the artifact manifest.
- Which versions a given caller may request beyond lifecycle state (allow-list per API key) is open.

### Data
- **Ingestor**: people input records (challenge cases, labels) through the ingestor. It is the only place records are written. There is no push API for customer apps: data comes from people through the ingestor, and from connectors.
- **Challenge datasets** are stored by Toa, hand-labeled, and kept forever.
- **Representative data** from customer projects is connected, not copied: **read-through connectors** to the customer's datastores, never stored. The connector interface is pluggable from the start. S3 is the first implementation.
- Evaluation results hold **references and verdicts only**: case reference, content hash, verdict. The UI fetches the text from the source when it is viewed.
- Runs pin the source state (S3 object version or ETag, or query plus time bound) and record per-case content hashes.
- Labeling a connected case **promotes** it, which copies it into a challenge dataset. The UI warns about PII.
- Records are labeled by hand. Record who labeled each case and flag labeler disagreement.
- Triage before labeling: deduplicate, then prioritize cases where policy versions disagree or the judge is least certain.

### Dataset splits
- **One split config per policy.** It picks which partitions the policy uses and their proportions: test only, train and test, or train, validation and test. Validation can be added later.
- **Sticky assignments.** When a record is ingested, its split is computed once and stored on the record. It is never recomputed. Changing the proportions later only affects records ingested afterwards.
- The computation at ingest is deterministic: a float in [0, 1) from a hash of the policy key and the record's split key, compared to the cutoffs in force at that moment. It never depends on insertion order or randomness.
- **Group key**: records carry an optional group key that authors set on variants of the same adversarial attack (e.g. paraphrases of one jailbreak). The split key is the group key when present and the record id otherwise. **A new record whose group key already has records inherits that group's stored split**, because the cutoffs may have changed since the first variant arrived.
- The group key is set at ingest and is immutable. To fix a mistake, delete the record and ingest a new one.
- **Test records never move.** No action reassigns a record out of test. Adding a validation partition later is an explicit action that can carve records out of train only.
- The stored assignment is data. It is included in exports and imports, so moving a dataset between installs does not change its splits.
- Because assignments are fixed, the real proportions drift from the configured ones as proportions change. Show actual versus configured counts.
- Show label counts per split and warn when a split has too few cases of a class. Small challenge datasets split unevenly by chance.
- Test results are shown in aggregate only. Per-case detail is shown for train and validation, so authors cannot tune against individual test cases.

### Security
- Connector credentials are read-only, least-privilege, per project, kept in a secrets backend with rotation, and used only by the worker.
- User-supplied connection targets are allow-listed (SSRF). SQL sources, if added, use read-only roles, statement timeouts and read replicas.
- Dataset text is hostile: treat it as data in judge prompts (prompt injection) and escape it in the UI (XSS).
- Never put raw case text in logs, audit entries or error messages.
- Judge credentials live in the engine deployment, referenced by alias.
- Note: cases still transit the worker and engine to the judge, and judge output can quote them. If the judge is a hosted API, text leaves the customer's network.

## Implementation status

Schema design is in `docs/schemas.md`.

`apps/toa-policy` is a bare TypeScript init project with no source. A first schema and split implementation (zod, 43 tests) was written and then removed on 2026-10-03. `docs/schemas.md` records it precisely enough to rebuild, along with the issues found in review.

Built, in `apps/toa-engine`: config loading, JSON logging, `GET /health`, and a stub `inference` handler that is not registered yet. None of the engine call contract is implemented.

**v1 scope**, thinnest path that proves the loop:
1. Schema (specified in `docs/schemas.md`, not implemented).
2. Postgres and a minimal API: create and publish policy versions, ingest labeled records (assigning splits at ingest).
3. One engine endpoint following the call contract, with a fake judge first.
4. An eval run: the worker sends a policy's test split to the dev engine and stores verdicts, with aggregate precision and recall.

**Deferred past v1:** lifecycle and roadmap UI (the state fields are in the schema spec), artifact store and signing (the engine can read published versions directly), OIDC and RBAC (start with the local admin), connectors (upload first), API-key allow-list, result caching, cost controls.

## Open questions

1. **Caller identity and allow-list**: usage-per-version and any allow-list both need an API key per project. Should the engine enforce an allow-list per key (so promotion changes what is allowed)?
2. **Judge determinism**: how repeatable must the judge be for caching to be valid, and how is that recorded?
3. **Metrics**: which are reported (precision, recall, false-positive rate)?
4. **Artifact signing**: where do signing keys live in a self-hosted install, and how are they rotated?
5. **Cost controls**: per-policy judge tiers or budgets.
6. **Approvals**: four-eyes approval is deferred. Version history and audit exist so it can be added later.
