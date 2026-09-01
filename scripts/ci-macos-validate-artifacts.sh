#!/usr/bin/env bash
# Validate signed + notarized macOS artifacts (app bundle and DMG).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ROOT="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}"
if [[ -n "${MACOS_TARGET:-}" ]]; then
  RELEASE_DIR="$TARGET_ROOT/$MACOS_TARGET/release"
else
  RELEASE_DIR="$TARGET_ROOT/release"
fi
BUNDLE_DIR="$RELEASE_DIR/bundle"
APP_PATH="$BUNDLE_DIR/macos/Musomo Tracker.app"

shopt -s nullglob
DMG_PATHS=("$BUNDLE_DIR/dmg"/Musomo\ Tracker_*.dmg)
if ((${#DMG_PATHS[@]} == 0)); then
  echo "::error::No DMG found in $BUNDLE_DIR/dmg/"
  exit 1
fi
DMG_PATH="${DMG_PATHS[0]}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "::error::App bundle not found: $APP_PATH"
  exit 1
fi

echo "Artifact app: $APP_PATH"
echo "Artifact dmg: $DMG_PATH"

staple_if_needed() {
  local target="$1"
  if xcrun stapler validate "$target" >/dev/null 2>&1; then
    echo "Stapler ticket present: $target"
    return 0
  fi
  echo "Stapler ticket missing — attempting staple: $target"
  xcrun stapler staple "$target"
  xcrun stapler validate "$target"
}

echo "==> codesign verify (app)"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
codesign -dv --verbose=4 "$APP_PATH"

echo "==> stapler validate (app)"
staple_if_needed "$APP_PATH"

echo "==> Gatekeeper assessment (app)"
spctl -a -vv -t install "$APP_PATH"

echo "==> stapler validate (dmg)"
xcrun stapler validate "$DMG_PATH"

echo "==> Gatekeeper assessment (dmg)"
spctl -a -vv -t install "$DMG_PATH"

echo "All macOS artifact validations passed."
