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
- `internal/`: private packages (create as needed)
- `dev/`: local dev helpers that are not part of the repo

## Conventions
- Stick to the standard library unless a dependency clearly pays for itself; run `go mod tidy` after adding one.
- Wrap errors with context: `fmt.Errorf("doing x: %w", err)`. Don't panic in library code.
- Table-driven tests in `_test.go` files next to the code they test.
- Formatting is automatic: a hook runs `gofmt` after every edit.
