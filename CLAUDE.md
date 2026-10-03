# toa

Toa is designed to be a high performance guardrails as a service provider. This specfic component is designed to be the execution platform.

Monorepo: each app lives in `apps/<name>/` as its own Go module. Currently one app, `apps/toa-engine` (module `github.com/djhardy99/toa`, Go 1.22).

## Commands
Run from the repo root; the root `Makefile` delegates to `apps/toa-engine`. Add new apps to its `APP` list.
- `make run`: run the app
- `make build`: build to `apps/toa-engine/bin/toa`
- `make test`: run all tests
- `make check`: gofmt check + vet + tests. **Run this before calling any change done.**

## Layout
Paths below are relative to `apps/toa-engine/` unless stated otherwise. `.claude/`, `CLAUDE.md` and `dev/` stay at the repo root.
- `main.go`: entry point and wiring only. Loads config, builds the logger, creates `Server`, registers routes (move it to `cmd/toa/` if a second binary appears)
- `cfg/core.json`: runtime config (currently `{"port": 4001}`). The path is relative to the working directory, so run from `apps/toa-engine/` (`make run` does this)
- `src/utils/`: `config.go` (`Config`, `LoadConfig`) and `logger.go` (`NewLogger`, JSON `slog` to stderr). Candidate to split into `config` and `logging` packages
- `src/core/`: (planned, empty) the execution engine (`Guardrail` interface, `Input`/`Result`, `Engine`, registry). Users are not expected to edit it. Changes here affect every guardrail, so keep the public surface small and performance-sensitive paths allocation-conscious.
- `src/lib/`: (planned) guardrail packages. This is the extension point users add to or edit. One package per guardrail (or family of guardrails). Each guardrail implements `core.Guardrail` and registers itself via `core.Register` in `init()`; see `lib/blocklist` as the template. `core/` must never import `lib/`.
- `dev/`: local dev helpers that are not part of the repo

## Architecture
- Toa is a performance-focused guardrails executor: `core/` runs guardrails, `lib/` defines them.
- Performance matters. Benchmark hot paths (`go test -bench`) and avoid unnecessary allocations, reflection, and global locks in `core/`.

## Conventions
- Stick to the standard library unless a dependency clearly pays for itself; run `go mod tidy` after adding one.
- Wrap errors with context: `fmt.Errorf("doing x: %w", err)`. Don't panic in library code.
- Inject dependencies by hand: `main` builds the logger once and passes it into structs via fields (see `Server` in `main.go`); handlers are methods on the struct. No DI frameworks. Don't log on `core/` hot paths; return results/errors and let the caller log.
- Table-driven tests in `_test.go` files next to the code they test.
- Formatting is automatic: a hook runs `gofmt` after every edit.
