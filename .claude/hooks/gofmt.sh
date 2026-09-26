#!/usr/bin/env bash
# PostToolUse hook: keep Go files gofmt'd after Claude edits them.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
gofmt -w . 2>&1 >/dev/null || exit 2
