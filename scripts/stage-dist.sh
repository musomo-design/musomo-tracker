#!/usr/bin/env bash
# Copy Tauri release bundles into dist/vVERSION/ without deleting older builds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
BUNDLE="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}/release/bundle"
DEST="$ROOT/dist/v$VERSION"

if [[ ! -d "$BUNDLE/macos/Musomo Tracker.app" ]]; then
  echo "Missing release bundle at: $BUNDLE/macos/Musomo Tracker.app" >&2
  echo "Run: npm run build" >&2
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST/Musomo Tracker.app"
cp -R "$BUNDLE/macos/Musomo Tracker.app" "$DEST/"
shopt -s nullglob
for dmg in "$BUNDLE/dmg"/Musomo\ Tracker_${VERSION}_*.dmg; do
  cp "$dmg" "$DEST/"
done

echo "Staged v$VERSION → dist/v$VERSION/"
ls -lh "$DEST"
