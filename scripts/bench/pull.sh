#!/usr/bin/env bash
# Copies the captures a development build recorded for the reading benchmark
# into $BENCH_DIR/captures, then empties the folder on the phone. The phone is
# only emptied after every file has landed locally.
set -euo pipefail

: "${BENCH_DIR:?Set BENCH_DIR to the local benchmark folder}"

IOS_BUNDLE_ID="com.jbgsoft.CestApp"
ANDROID_PACKAGE="com.jbgsoft.cestapp"

platform="${1:-}"
dest="$BENCH_DIR/captures"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT
mkdir -p "$dest" "$staging/pulled"

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
  ' "$staging/devices.json" || { echo "No iPhone found. Connect one, or set DEVICE." >&2; exit 1; }
}

case "$platform" in
  ios)
    device="$(ios_device)"
    xcrun devicectl device copy from --device "$device" \
      --domain-type appDataContainer --domain-identifier "$IOS_BUNDLE_ID" \
      --source Documents/bench --destination "$staging/pulled"
    ;;
  android)
    adb exec-out run-as "$ANDROID_PACKAGE" tar c files/bench | tar x -C "$staging/pulled"
    ;;
  *)
    echo "Usage: BENCH_DIR=<folder> $0 <ios|android>" >&2
    exit 64
    ;;
esac

count=0
while IFS= read -r -d '' file; do
  cp -n "$file" "$dest/"
  count=$((count + 1))
done < <(find "$staging/pulled" -type f ! -name '.*' -print0)

if [ "$count" -eq 0 ]; then
  echo "Nothing recorded on the phone."
  exit 0
fi

case "$platform" in
  ios)
    mkdir -p "$staging/empty"
    xcrun devicectl device copy to --device "$device" \
      --domain-type appDataContainer --domain-identifier "$IOS_BUNDLE_ID" \
      --source "$staging/empty" --destination Documents/bench \
      --remove-existing-content true
    ;;
  android)
    adb shell run-as "$ANDROID_PACKAGE" rm -rf files/bench
    ;;
esac

echo "Pulled $count files into $dest"
