#!/usr/bin/env bash
# Copies the captures a development build recorded for the reading benchmark
# into $BENCH_DIR/captures, then empties the folder on the phone. The phone is
# only emptied after every file has landed locally.
set -euo pipefail

IOS_BUNDLE_ID="com.jbgsoft.CestApp"
ANDROID_PACKAGE="com.jbgsoft.cestapp"

# The repository is public, and receipts carry card digits, addresses and times.
check_bench_dir() {
  local bench repo
  bench="$(node -p 'require("path").resolve(process.argv[1])' "$1")"
  repo="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
  case "$bench/" in
    "$repo/"*)
      echo "BENCH_DIR is inside the repository, which is public. Use a folder outside it." >&2
      return 1
      ;;
  esac
}

# Prints "<copied> <already there>". A file already here with the same content
# is skipped, so a pull whose emptying failed can simply run again; a different
# file under the same name stops everything before the phone is emptied.
merge_captures() {
  local from=$1 dest=$2 file target copied=0 kept=0
  while IFS= read -r -d '' file; do
    target="$dest/$(basename "$file")"
    if [ -e "$target" ]; then
      if cmp -s "$file" "$target"; then
        kept=$((kept + 1))
        continue
      fi
      echo "$(basename "$file") differs from the copy already in $dest; leaving the phone as it is." >&2
      return 1
    fi
    cp "$file" "$target"
    copied=$((copied + 1))
  done < <(find "$from" -type f ! -name '.*' -print0)
  echo "$copied $kept"
}

ios_device() {
  if [ -n "${DEVICE:-}" ]; then
    echo "$DEVICE"
    return
  fi
  xcrun devicectl list devices --json-output "$staging/devices.json" >/dev/null
  node -e '
    const devices = require(process.argv[1]).result.devices;
    const phones = devices.filter(
      (d) => d.hardwareProperties?.reality === "physical" && d.hardwareProperties?.deviceType === "iPhone"
    );
    const phone = phones.find((d) => d.connectionProperties?.tunnelState === "connected") ?? phones[0];
    if (!phone) process.exit(1);
    process.stdout.write(phone.identifier);
  ' "$staging/devices.json" || { echo "No iPhone found. Connect one, or set DEVICE." >&2; return 1; }
}

main() {
  : "${BENCH_DIR:?Set BENCH_DIR to the local benchmark folder}"
  local platform="${1:-}"
  case "$platform" in
    ios | android) ;;
    *)
      echo "Usage: BENCH_DIR=<folder> $0 <ios|android>" >&2
      exit 64
      ;;
  esac
  check_bench_dir "$BENCH_DIR"

  local dest="$BENCH_DIR/captures" device="" counts copied kept
  staging="$(mktemp -d)"
  trap 'rm -rf "$staging"' EXIT
  mkdir -p "$dest" "$staging/pulled"

  if [ "$platform" = ios ]; then
    device="$(ios_device)"
    xcrun devicectl device copy from --device "$device" \
      --domain-type appDataContainer --domain-identifier "$IOS_BUNDLE_ID" \
      --source Documents/bench --destination "$staging/pulled"
  else
    adb exec-out run-as "$ANDROID_PACKAGE" tar c files/bench | tar x -C "$staging/pulled"
  fi

  counts="$(merge_captures "$staging/pulled" "$dest")"
  read -r copied kept <<<"$counts"

  if [ $((copied + kept)) -eq 0 ]; then
    echo "Nothing recorded on the phone."
    exit 0
  fi

  if [ "$platform" = ios ]; then
    mkdir -p "$staging/empty"
    xcrun devicectl device copy to --device "$device" \
      --domain-type appDataContainer --domain-identifier "$IOS_BUNDLE_ID" \
      --source "$staging/empty" --destination Documents/bench \
      --remove-existing-content true
  else
    adb shell run-as "$ANDROID_PACKAGE" rm -rf files/bench
  fi

  local noun=files
  [ "$copied" -eq 1 ] && noun=file
  echo "Pulled $copied new $noun into $dest ($kept already there)."
}

main "$@"
