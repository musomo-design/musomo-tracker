#!/usr/bin/env bash
# Prepare temporary keychain + App Store Connect API key for macOS CI signing/notarization.
# Reads credentials from environment variables only — never logs secret values.
set -euo pipefail

: "${KEYCHAIN_PASSWORD:?KEYCHAIN_PASSWORD is required}"
: "${APPLE_CERTIFICATE:?APPLE_CERTIFICATE is required}"
: "${APPLE_CERTIFICATE_PASSWORD:?APPLE_CERTIFICATE_PASSWORD is required}"
: "${APPLE_API_KEY:?APPLE_API_KEY is required}"
: "${APPLE_API_ISSUER:?APPLE_API_ISSUER is required}"
: "${APPLE_API_KEY_CONTENT:?APPLE_API_KEY_CONTENT is required}"

KEYCHAIN_PATH="${RUNNER_TEMP:?}/musomo-signing.keychain-db"
CERT_PATH="${RUNNER_TEMP}/certificate.p12"
P8_PATH="${RUNNER_TEMP}/AuthKey.p8"

cleanup() {
  rm -f "$CERT_PATH"
}
trap cleanup EXIT

echo "Creating temporary signing keychain…"
security delete-keychain "$KEYCHAIN_PATH" >/dev/null 2>&1 || true
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

echo "Importing Developer ID certificate…"
echo -n "$APPLE_CERTIFICATE" | base64 -D > "$CERT_PATH"
security import "$CERT_PATH" \
  -P "$APPLE_CERTIFICATE_PASSWORD" \
  -A \
  -t cert \
  -f pkcs12 \
  -k "$KEYCHAIN_PATH"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychain -d user -s "$KEYCHAIN_PATH" login.keychain-db

echo "Writing App Store Connect API key…"
if printf '%s' "$APPLE_API_KEY_CONTENT" | base64 -D > "$P8_PATH" 2>/dev/null && [ -s "$P8_PATH" ]; then
  :
else
  printf '%s' "$APPLE_API_KEY_CONTENT" > "$P8_PATH"
fi
chmod 600 "$P8_PATH"

echo "Preflight: validating notarytool credentials…"
if ! xcrun notarytool history \
  --key "$P8_PATH" \
  --key-id "$APPLE_API_KEY" \
  --issuer "$APPLE_API_ISSUER" \
  >"${RUNNER_TEMP}/notary-preflight.out" 2>"${RUNNER_TEMP}/notary-preflight.err"; then
  echo "::error::notarytool authentication failed. Check APPLE_API_KEY, APPLE_API_ISSUER, and APPLE_API_KEY_CONTENT."
  sed 's/^/::error::/' "${RUNNER_TEMP}/notary-preflight.err" || true
  exit 1
fi

{
  echo "APPLE_API_KEY_PATH=$P8_PATH"
  echo "KEYCHAIN_PATH=$KEYCHAIN_PATH"
} >> "${GITHUB_ENV:?}"

echo "Signing environment ready."
