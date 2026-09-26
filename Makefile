.PHONY: build run test fmt vet check

build:
	go build -o bin/toa .

run:
	go run .

test:
	go test ./...

fmt:
	gofmt -w .

vet:
	go vet ./...

# Run before considering any change done.
check:
	@test -z "$$(gofmt -l .)" || (echo "gofmt needed on:"; gofmt -l .; exit 1)
	go vet ./...
	go test ./...
