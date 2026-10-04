.PHONY: build run test fmt vet check docs-check policy-dev policy-check

# Delegates to the toa-engine module. Add more apps here as they appear.
APP := apps/toa-engine

build run test fmt vet:
	$(MAKE) -C $(APP) $@

# Verify CLAUDE.md and docs/ still match the repo.
docs-check:
	./scripts/docs-check.sh

# Run the toa-policy dev server (http://localhost:5173).
policy-dev:
	npm --prefix apps/toa-policy run dev

# Typecheck toa-policy.
policy-check:
	npm --prefix apps/toa-policy run check

# Docs, toa-policy and engine checks. Run before considering any change done.
check: docs-check policy-check
	$(MAKE) -C $(APP) check
