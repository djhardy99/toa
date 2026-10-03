# toa

Toa is designed to be a high performance guardrails as a service provider. `toa-engine` is the execution platform; `toa-policy` is where guardrails are designed and evaluated.

Monorepo: each app lives in `apps/<name>/` with its own toolchain. Apps:
- `apps/toa-engine`: the Go executable that runs guardrails in production (module `github.com/djhardy99/toa`, Go 1.22).
- `apps/toa-policy`: TypeScript app where people design guardrails (made of policies), build challenge datasets, and run representative data against projects to see the impact. Node 22, TypeScript 7.

System design and decisions: `docs/design.md`. Read it before changing architecture. **Keep it and this file up to date**: update `docs/design.md` when a decision changes, and this file when commands, layout or conventions change.

## Commands
Go (run from the repo root; the root `Makefile` delegates to `apps/toa-engine`; add new Go apps to its `APP` line):
- `make run`: run the engine
- `make build`: build to `apps/toa-engine/bin/toa`
- `make test`: run all Go tests
- `make check`: gofmt check + vet + tests. **Run this before calling any engine change done.** It does not cover `toa-policy`.

TypeScript (run in `apps/toa-policy/`):
- `npm run check`: typecheck + build + tests. **Run this before calling any toa-policy change done.**

## toa-engine
Paths are relative to `apps/toa-engine/`. `.claude/`, `CLAUDE.md`, `docs/` and `dev/` stay at the repo root.
- `main.go`: entry point and wiring only. Loads config, builds the logger, registers each route package on the mux (`health.Register(mux)`, `v1.NewHandler(logger).Register(mux)`). Move it to `cmd/toa/` if a second binary appears.
- `cfg/core.json`: runtime config (currently `{"port": 4001}`). The path is relative to the working directory, so run from `apps/toa-engine/` (`make run` does this).
- `src/utils/`: `config.go` (`Config`, `LoadConfig`) and `logger.go` (`NewLogger`, JSON `slog` to stderr). Candidate to split into `config` and `logging` packages.
- `src/routes/health/`: `GET /health`, registered once at the root, no logger.
- `src/routes/v1/`: versioned API. `Handler` holds the logger. `inference.go` exists but is not registered yet.
- `src/core/`: (planned, empty) the execution engine (`Guardrail` interface, `Input`/`Result`, `Engine`, registry). Users are not expected to edit it. Changes here affect every guardrail, so keep the public surface small and performance-sensitive paths allocation-conscious.
- `src/lib/`: (planned) guardrail packages. This is the extension point users add to or edit. One package per guardrail (or family of guardrails). Each guardrail implements `core.Guardrail` and registers itself via `core.Register` in `init()`; see `lib/blocklist` as the template. `core/` must never import `lib/`.
- `dev/`: local dev helpers that are not part of the repo.

The engine's call contract (a list of `{guardrail, version}`, any block wins, fast and complete modes, `version_retired` as a 400) is specified in `docs/design.md` and is not implemented yet.

## toa-policy
Concepts: a **Policy** is one measurable rule; a **Guardrail** is a set of policies (e.g. `security` = `no-data-leakage` + `no-secrets-leakage` + `no-system-prompt-leakage`). Both are immutable and versioned (`PolicyVersion`, `GuardrailVersion`) and have a lifecycle (`active`, `deprecated`, `retired`). A **Dataset** belongs to one policy and holds records plus a split config.
- `src/schema.ts`: zod schemas and inferred types. This is the contract with `toa-engine`; change it deliberately and keep the Go side in sync.
- `src/split.ts`: deterministic split assignment (hash of policy key plus group key or record id).
- Invariants to preserve: a record's split is assigned once at ingest and stored (sticky); test records never move; a record with a group key inherits the group's stored split; group keys are immutable; policies reference judges by alias and never contain credentials.
- Status: schema and split logic only. No database or API yet; the v1 plan is in `docs/design.md`.
- Dependencies: zod only at runtime. Tests use `node:test` on the compiled `dist/`. TypeScript 7 does not auto-load `@types`, so `tsconfig.json` lists `"types": ["node"]`. Node 22.2 cannot take a directory for `node --test`, so the script passes a glob.

## Architecture
- Toa is a performance-focused guardrails executor: `core/` runs guardrails, `lib/` defines them.
- Performance matters. Benchmark hot paths (`go test -bench`) and avoid unnecessary allocations, reflection, and global locks in `core/`.

## Conventions
- Stick to the standard library unless a dependency clearly pays for itself; run `go mod tidy` after adding a Go dependency.
- Wrap errors with context: `fmt.Errorf("doing x: %w", err)`. Don't panic in library code.
- Inject dependencies by hand: `main` builds the logger once and passes it into structs via fields (see `v1.Handler`); handlers are methods on the struct. No DI frameworks. Don't log on `core/` hot paths; return results/errors and let the caller log.
- Table-driven tests in `_test.go` files (Go) or `*.test.ts` files (TypeScript) next to the code they test.
- Formatting: a hook runs `gofmt` after every edit. TypeScript has no formatter configured.
