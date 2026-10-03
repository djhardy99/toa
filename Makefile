.PHONY: build run test fmt vet check

# Delegates to the toa-engine module. Add more apps here as they appear.
APP := apps/toa-engine

build run test fmt vet check:
	$(MAKE) -C $(APP) $@
