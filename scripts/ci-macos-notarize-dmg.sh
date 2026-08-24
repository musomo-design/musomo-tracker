#!/usr/bin/env bash
# Submit the final DMG to Apple notarization, staple the ticket, and validate.
# Reuses APPLE_API_KEY_PATH, APPLE_API_KEY, APPLE_API_ISSUER from the CI environment.
set -euo pipefail

: "${APPLE_API_KEY_PATH:?APPLE_API_KEY_PATH is required}"
: "${APPLE_API_KEY:?APPLE_API_KEY is required}"
: "${APPLE_API_ISSUER:?APPLE_API_ISSUER is required}"

APPLE_API_KEY="$(printf '%s' "$APPLE_API_KEY" | tr -d '[:space:]')"
APPLE_API_ISSUER="$(printf '%s' "$APPLE_API_ISSUER" | tr -d '[:space:]')"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_DIR="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}/release/bundle"
APP_PATH="$BUNDLE_DIR/macos/Musomo Tracker.app"

shopt -s nullglob
DMG_PATHS=("$BUNDLE_DIR/dmg"/Musomo\ Tracker_*.dmg)
if ((${#DMG_PATHS[@]} == 0)); then
  echo "::error::No DMG found in $BUNDLE_DIR/dmg/"
  exit 1
fi
DMG_PATH="${DMG_PATHS[0]}"

echo "DMG path: $DMG_PATH"

if [[ -d "$APP_PATH" ]]; then
  echo "Sanity check: verifying bundled app signature…"
  codesign --verify --deep --strict "$APP_PATH"
  echo "Bundled app signature OK."
else
  echo "::warning::Bundled app not found at $APP_PATH — continuing with DMG notarization"
fi

echo "Submitting DMG for notarization…"
SUBMIT_LOG="${RUNNER_TEMP:-/tmp}/notary-submit-dmg.log"
if ! xcrun notarytool submit "$DMG_PATH" \
  --key "$APPLE_API_KEY_PATH" \
  --key-id "$APPLE_API_KEY" \
  --issuer "$APPLE_API_ISSUER" \
  --wait \
  >"$SUBMIT_LOG" 2>&1; then
  echo "::error::DMG notarization rejected or failed."
  grep -E 'status|Status|error|Error|Invalid|Rejected' "$SUBMIT_LOG" | sed 's/^/::error::/' || true
  exit 1
fi

if grep -qiE 'status: Invalid|status: Rejected|Status: Invalid|Status: Rejected' "$SUBMIT_LOG"; then
  echo "::error::DMG notarization was not accepted."
  grep -E 'status|Status|id|message' "$SUBMIT_LOG" | sed 's/^/::error::/' || true
  exit 1
fi

grep -E 'status|Status|id' "$SUBMIT_LOG" | sed 's/^/notary: /' || true

echo "Stapling notarization ticket to DMG…"
xcrun stapler staple "$DMG_PATH"

echo "Validating stapled DMG…"
xcrun stapler validate "$DMG_PATH"

echo "DMG notarization and stapling complete."
