#!/usr/bin/env bash
# Runs pull.sh against a stand-in adb that serves a local folder as the phone.
# Usage: scripts/bench/test-pull.sh
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(git -C "$here" rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir -p "$work/bin"
cat > "$work/bin/adb" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  exec-out) cd "$FAKE_PHONE" && tar c files/bench 2>/dev/null ;;
  shell) rm -rf "$FAKE_PHONE/files/bench" ;;
esac
EOF
chmod +x "$work/bin/adb"
export PATH="$work/bin:$PATH"
export FAKE_PHONE="$work/phone"

failures=0
check() {
  if eval "$2"; then
    echo "ok   - $1"
  else
    echo "FAIL - $1"
    failures=$((failures + 1))
  fi
}

record() {
  mkdir -p "$FAKE_PHONE/files/bench"
  printf '%s' "$2" > "$FAKE_PHONE/files/bench/$1"
}

pull() {
  BENCH_DIR="$1" "$here/pull.sh" android > "$work/out" 2>&1
  echo $? > "$work/status"
}

bench="$work/bench"

record a.json '{"id":"a"}'
record a.jpg 'image-a'
pull "$bench"
check "a first pull copies everything" '[ "$(cat "$work/status")" = 0 ] && [ -f "$bench/captures/a.json" ] && [ -f "$bench/captures/a.jpg" ]'
check "a first pull empties the phone" '[ ! -d "$FAKE_PHONE/files/bench" ]'

record a.json '{"id":"a"}'
record a.jpg 'image-a'
record b.json '{"id":"b"}'
pull "$bench"
check "a re-pull after a failed empty skips what is already here" '[ "$(cat "$work/status")" = 0 ] && [ -f "$bench/captures/b.json" ]'
check "a re-pull says how many were new" 'grep -q "Pulled 1 new file" "$work/out"'
check "a re-pull empties the phone" '[ ! -d "$FAKE_PHONE/files/bench" ]'

record a.json '{"id":"a","changed":true}'
pull "$bench"
check "a different file under a known name stops the pull" '[ "$(cat "$work/status")" != 0 ] && grep -q "a.json differs" "$work/out"'
check "a stopped pull leaves the phone alone" '[ -f "$FAKE_PHONE/files/bench/a.json" ]'
check "a stopped pull keeps the local copy" '[ "$(cat "$bench/captures/a.json")" = "{\"id\":\"a\"}" ]'
rm -rf "$FAKE_PHONE/files/bench"

inside="$repo/bench-test-$$"
record c.json '{"id":"c"}'
pull "$inside"
check "a folder inside the repository is refused" '[ "$(cat "$work/status")" != 0 ] && grep -q "inside the repository" "$work/out"'
check "nothing is written inside the repository" '[ ! -e "$inside" ]'
check "a refused pull leaves the phone alone" '[ -f "$FAKE_PHONE/files/bench/c.json" ]'
rm -rf "$inside"

[ "$failures" -eq 0 ] && echo "all pull checks passed"
exit "$failures"
