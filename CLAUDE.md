# toa

Toa is designed to be a high performance guardrails as a service provider. `toa-engine` is the execution platform; `toa-policy` is where guardrails are designed and evaluated.

Monorepo: each app lives in `apps/<name>/` with its own toolchain. Apps:
- `apps/toa-engine`: the Go executable that runs guardrails in production (module `github.com/djhardy99/toa`, Go 1.22).
- `apps/toa-policy`: **parked.** Planned TypeScript app where people design guardrails (made of policies), build challenge datasets, and run representative data against projects to see the impact. Currently only a bare TypeScript init project (no source code).

System design and decisions: `docs/design.md`. Schema design: `docs/schemas.md`. Read them before changing architecture. **Keep it and this file up to date**: update `docs/design.md` and `docs/schemas.md` when a decision changes, and this file when commands, layout or conventions change.

## Commands
Go (run from the repo root; the root `Makefile` delegates to `apps/toa-engine`; add new Go apps to its `APP` line):
- `make run`: run the engine
- `make build`: build to `apps/toa-engine/bin/toa`
- `make test`: run all Go tests
- `make docs-check`: verify CLAUDE.md and `docs/` still match the repo (`scripts/docs-check.sh`)
- `make policy-dev`: run the toa-policy dev server; `make policy-check`: typecheck toa-policy
- `make check`: docs-check + policy-check + gofmt check + vet + tests. **Run this before calling any change done.**

TypeScript (run in `apps/toa-policy/`): `npm run dev` (Vite dev server, http://localhost:5173), `npm run check` (typecheck), `npm run build` (clean build to `dist/`). No tests yet; add them to `check` with the first real code.

## Keeping docs current
CLAUDE.md and `docs/` are the knowledge base for AI assistants working in this repo. They hold what the code cannot say (decisions and reasons, contracts, gotchas, commands); they do not copy code.
- `scripts/docs-check.sh` (`make docs-check`): deterministic checks. Every app and doc is referenced here, every `make` target mentioned exists, doc links resolve, and the toa-engine layout bullets point at real paths (bullets marked "planned" are skipped).
- `.claude/hooks/docs-sync.sh`: records files edited this turn; at the end of a turn, if code changed but no doc did, or `docs-check` fails, it asks for a sync. If no doc change is needed, say so in one line and stop.
- `.claude/skills/sync-docs/`: the procedure for the update. Use it when the hook reports drift or when asked to refresh the docs.
- Hook state lives in `.claude/.docs-state/` (gitignored).

## toa-engine
Paths are relative to `apps/toa-engine/`. `.claude/`, `CLAUDE.md`, `docs/` and `dev/` stay at the repo root.
- `main.go`: entry point and wiring only. Loads config, builds the logger, registers each route package on the mux (`health.Register(mux)`, `v1.NewHandler(logger).Register(mux)`). Move it to `cmd/toa/` if a second binary appears.
- `cfg/core.json`: runtime config (currently `{"port": 4001}`). The path is relative to the working directory, so run from `apps/toa-engine/` (`make run` does this).
- `src/utils/`: `config.go` (`Config`, `LoadConfig`) and `logger.go` (`NewLogger`, JSON `slog` to stderr). Candidate to split into `config` and `logging` packages.
- `src/routes/health/`: `GET /health`, registered once at the root, no logger.
- `src/routes/v1/`: versioned API. `Handler` holds the logger. `inference.go` exists but is not registered yet.
- `src/core/`: (planned, empty) the execution engine (`Guardrail` interface, `Input`/`Result`, `Engine`, registry). Users are not expected to edit it. Changes here affect every guardrail, so keep the public surface small and performance-sensitive paths allocation-conscious.
- `src/lib/`: (planned) guardrail packages. This is the extension point users add to or edit. One package per guardrail (or family of guardrails). Each guardrail implements `core.Guardrail` and registers itself via `core.Register` in `init()`; see `lib/jailbreak` as the template. `core/` must never import `lib/`.
- `dev/`: local dev helpers that are not part of the repo.

The engine's call contract (a list of `{guardrail, version}`, any block wins, fast and complete modes, `version_retired` as a 400) is specified in `docs/design.md` and is not implemented yet.

## toa-policy
React + TypeScript project, parked, viewable in the browser. `package.json` (scripts `dev`, `build`, `typecheck`, `check`; Node >=22), `tsconfig.json` (strict, NodeNext, DOM lib, source in `src/`, output in `dist/`), `index.html` (Vite entry, loads `src/index.tsx`), `vite.config.ts` (React plugin) and a placeholder React component in `src/index.tsx`. React 19 SPA on Vite (chosen over SvelteKit: the Go engine is the backend, so no server layer is needed). `@types/node` is pinned to major 22 to match the runtime. Relative imports under NodeNext need a `.js` extension (`./App.js` resolves to `App.tsx`). `npm run build` is still plain `tsc`, not `vite build`.
- `tsconfig.json` lists `"types": ["node"]` because TypeScript 7 does not auto-load `@types`.
- The earlier schema and split code was removed; its design is in `docs/schemas.md` and the rationale in `docs/design.md`. Known issues to fix in any rebuild are at the end of `docs/schemas.md`.

## Architecture
- Toa is a performance-focused guardrails executor: `core/` runs guardrails, `lib/` defines them.
- Performance matters. Benchmark hot paths (`go test -bench`) and avoid unnecessary allocations, reflection, and global locks in `core/`.

## Conventions
- Stick to the standard library unless a dependency clearly pays for itself; run `go mod tidy` after adding a Go dependency.
- Wrap errors with context: `fmt.Errorf("doing x: %w", err)`. Don't panic in library code.
- Inject dependencies by hand: `main` builds the logger once and passes it into structs via fields (see `v1.Handler`); handlers are methods on the struct. No DI frameworks. Don't log on `core/` hot paths; return results/errors and let the caller log.
- Table-driven tests in `_test.go` files next to the code they test.
- Formatting is automatic for Go: a hook runs `gofmt` after every edit. TypeScript has no formatter configured.
