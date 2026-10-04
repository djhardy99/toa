# Toa

High-performance guardrails as a service. Toa checks LLM inputs against a set of guardrails and returns an allow or block verdict, fast enough to sit in the request path of a production app.

- **Guardrails are bundles.** A guardrail version ships as a signed, immutable bundle: a manifest plus the files its stages need (regex rules, an ONNX classifier, a judge prompt). Adding a guardrail means shipping a bundle, not changing the engine.
- **Cheapest check first.** Stages run as a cascade (regex, then model, then LLM judge) and stop early, so most traffic never reaches the judge.
- **Explicit versioning.** Callers request guardrails by name and exact version. Any block wins. Old versions are deprecated with a warning, then retired on a published date.
- **Measured before shipped.** In toa-policy, authors write policies, build labeled challenge datasets, and run them against a customer project's representative data to see a guardrail's impact before promoting it.
- **Self-hosted.** Each customer runs their own install, with their own judge model endpoint and no telemetry to us.

Status: early. The engine has config, logging and a health check; the call contract in `docs/design.md` is not implemented yet.

## Apps

- [`apps/toa-engine`](apps/toa-engine): Go service that runs guardrails in production.
- [`apps/toa-policy`](apps/toa-policy): React + TypeScript app for designing guardrails and testing them against datasets (parked).

## Quick start

```sh
make run     # run the engine (port 4001)
make build   # build to apps/toa-engine/bin/toa
make check   # docs check, typecheck, gofmt, vet, tests
```

## Docs

- [`docs/design.md`](docs/design.md): system design and decisions
- [`docs/schemas.md`](docs/schemas.md): schema design
- [`CLAUDE.md`](CLAUDE.md): layout, commands and conventions

## License

See [LICENSE](LICENSE).
