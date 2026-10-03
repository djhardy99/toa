#!/usr/bin/env bash
# Mechanical checks that CLAUDE.md and docs/ still match the repo.
# Deterministic: no network, no LLM. Exits 1 and lists every problem found.
set -u
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root" || exit 1

claude=CLAUDE.md
eng=apps/toa-engine
problems=()
add() { problems+=("$1"); }

# 1. Every app directory is mentioned in CLAUDE.md.
for d in apps/*/; do
  name=$(basename "$d")
  grep -q "apps/$name" "$claude" || add "apps/$name is not mentioned in $claude"
done

# 2. Every `make <target>` named in CLAUDE.md exists in the root Makefile.
for t in $(grep -o '`make [a-z-]*`' "$claude" | sed 's/`make \(.*\)`/\1/' | sort -u); do
  grep -Eq "(^|[ ])$t([ :]|$)" Makefile || add "$claude mentions 'make $t' but the root Makefile has no such target"
done

# 3. Every docs/*.md is referenced from CLAUDE.md, and every referenced doc exists.
for f in docs/*.md; do
  [ -e "$f" ] || continue
  grep -q "$f" "$claude" || add "$f is not referenced in $claude"
done
for f in $(grep -o 'docs/[A-Za-z0-9_.-]*\.md' "$claude" | sort -u); do
  [ -f "$f" ] || add "$claude references $f, which does not exist"
done

# 4. Relative markdown links inside docs/ resolve.
for f in docs/*.md; do
  [ -e "$f" ] || continue
  for link in $(grep -oE '\]\([^)]+\)' "$f" | sed 's/^](//; s/)$//'); do
    case "$link" in http*|\#*|mailto:*) continue ;; esac
    target="${link%%#*}"
    [ -e "$(dirname "$f")/$target" ] || add "$f links to $link, which does not exist"
  done
done

# 5. Layout bullets under "## toa-engine" point at real paths (skipping ones marked "planned").
in_section=0
while IFS= read -r line; do
  case "$line" in
    "## toa-engine"*) in_section=1; continue ;;
    "## "*) in_section=0 ;;
  esac
  [ "$in_section" = 1 ] || continue
  case "$line" in "- \`"*) ;; *) continue ;; esac
  case "$line" in *planned*) continue ;; esac
  p=$(printf '%s' "$line" | sed -n 's/^- `\([^`]*\)`.*/\1/p')
  [ -n "$p" ] || continue
  if [ ! -e "$eng/$p" ] && [ ! -e "$p" ]; then
    add "$claude lists $p under toa-engine, but it exists neither in $eng nor at the repo root"
  fi
done < "$claude"

# 6. Every package directory under the engine's src/ is described in CLAUDE.md.
for d in "$eng"/src/*/; do
  [ -d "$d" ] || continue
  n=$(basename "$d")
  grep -q "src/$n" "$claude" || add "$eng/src/$n is not described in $claude"
done

if [ "${#problems[@]}" -gt 0 ]; then
  echo "docs-check found ${#problems[@]} problem(s):" >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi
echo "docs-check: ok"
