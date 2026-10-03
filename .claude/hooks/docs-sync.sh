#!/usr/bin/env bash
# Keeps CLAUDE.md and docs/ current. Used by the sync-docs skill.
#   record: PostToolUse on Edit/Write. Remembers which files changed this turn. Never blocks.
#   stop:   Stop. If code changed but no doc did, or docs-check fails, asks Claude to sync docs
#           (exit 2 feeds the message back). Allows stopping on the second try.
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
state_dir="$root/.claude/.docs-state"
input=$(cat)

json() { printf '%s' "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null; }
session=$(json 'd.get("session_id","default")')
session=${session:-default}
state="$state_dir/$session"

case "${1:-}" in
  record)
    path=$(json 'd.get("tool_input",{}).get("file_path","")')
    rel="${path#"$root"/}"
    mkdir -p "$state_dir"
    case "$rel" in
      docs/*|CLAUDE.md) echo "docs $rel" >> "$state" ;;
      *_test.go|*.test.ts) ;;
      apps/*|Makefile) echo "code $rel" >> "$state" ;;
    esac
    exit 0
    ;;
  stop)
    if [ "$(json 'd.get("stop_hook_active", False)')" = "True" ]; then
      rm -f "$state"; exit 0
    fi
    [ -s "$state" ] || exit 0
    code=$(grep -c '^code ' "$state" || true)
    docs=$(grep -c '^docs ' "$state" || true)
    changed=$(grep '^code ' "$state" | cut -d' ' -f2- | sort -u | head -8 | sed 's/^/    /')
    rm -f "$state"

    msg=""
    if [ "${code:-0}" -gt 0 ] && [ "${docs:-0}" -eq 0 ]; then
      msg="Code changed this turn but CLAUDE.md and docs/ were not touched:
$changed
Likely docs: apps/toa-engine -> CLAUDE.md (layout, commands) and docs/design.md (call contract, implementation status); apps/toa-policy -> docs/schemas.md and CLAUDE.md.
Use the sync-docs skill. If this change needs no doc update (refactor, bug fix, tests), say so in one line and stop."
    fi
    if ! check=$("$root/scripts/docs-check.sh" 2>&1); then
      msg="${msg:+$msg

}$check
Fix these with the sync-docs skill."
    fi
    [ -z "$msg" ] && exit 0
    printf '%s\n' "$msg" >&2
    exit 2
    ;;
esac
exit 0
