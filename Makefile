.PHONY: build run test fmt vet check docs-check

# Delegates to the toa-engine module. Add more apps here as they appear.
APP := apps/toa-engine

build run test fmt vet:
	$(MAKE) -C $(APP) $@

# Verify CLAUDE.md and docs/ still match the repo.
docs-check:
	./scripts/docs-check.sh

# Docs check plus engine checks. Run before considering any change done.
check: docs-check
	$(MAKE) -C $(APP) check
