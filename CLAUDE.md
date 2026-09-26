# toa

Toa is designed to be a high performance guardrails as a service provider. This specfic component is designed to be the execution platform.

Go module `github.com/djhardy99/toa` (Go 1.22).

## Commands
- `make run`: run the app
- `make build`: build to `bin/toa`
- `make test`: run all tests
- `make check`: gofmt check + vet + tests. **Run this before calling any change done.**

## Layout
- `main.go`: entry point (move it to `cmd/toa/` if a second binary appears)
- `core/`: the execution engine (`Guardrail` interface, `Input`/`Result`, `Engine`, registry). Users are not expected to edit it. Changes here affect every guardrail, so keep the public surface small and performance-sensitive paths allocation-conscious.
- `lib/`: guardrail packages. This is the extension point users add to or edit. One package per guardrail (or family of guardrails). Each guardrail implements `core.Guardrail` and registers itself via `core.Register` in `init()`; see `lib/blocklist` as the template. `core/` must never import `lib/`.
- `dev/`: local dev helpers that are not part of the repo

## Architecture
- Toa is a performance-focused guardrails executor: `core/` runs guardrails, `lib/` defines them.
- Performance matters. Benchmark hot paths (`go test -bench`) and avoid unnecessary allocations, reflection, and global locks in `core/`.

## Conventions
- Stick to the standard library unless a dependency clearly pays for itself; run `go mod tidy` after adding one.
- Wrap errors with context: `fmt.Errorf("doing x: %w", err)`. Don't panic in library code.
- Table-driven tests in `_test.go` files next to the code they test.
- Formatting is automatic: a hook runs `gofmt` after every edit.
