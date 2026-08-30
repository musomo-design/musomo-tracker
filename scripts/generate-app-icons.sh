#!/usr/bin/env bash
# Build macOS app icons from a single full-bleed 1024 PNG (no Tauri squircle mask).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/src/tracker-studio/asset/tracker-app-icon.png"
OUT="$ROOT/src-tauri/icons"
WORK="$ROOT/.cursor-tmp/icon-build"
ICONSET="$WORK/AppIcon.iconset"
MASTER="$WORK/master-rgba.png"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing source icon: $SOURCE" >&2
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$OUT" "$ICONSET"

python3 - "$SOURCE" "$MASTER" <<'PY'
import sys
from pathlib import Path
from PIL import Image

src, dst = map(Path, sys.argv[1:3])
img = Image.open(src)
if img.size != (1024, 1024):
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img.convert("RGBA").save(dst, "PNG")
PY

resize() {
  local size="$1"
  local dest="$2"
  sips -z "$size" "$size" "$MASTER" --out "$dest" >/dev/null
}

echo "→ PNG sizes…"
resize 32 "$OUT/32x32.png"
resize 64 "$OUT/64x64.png"
resize 128 "$OUT/128x128.png"
resize 256 "$OUT/128x128@2x.png"
resize 512 "$OUT/icon.png"

echo "→ icon.icns…"
resize 16 "$ICONSET/icon_16x16.png"
resize 32 "$ICONSET/icon_16x16@2x.png"
cp "$OUT/32x32.png" "$ICONSET/icon_32x32.png"
cp "$OUT/64x64.png" "$ICONSET/icon_32x32@2x.png"
cp "$OUT/128x128.png" "$ICONSET/icon_128x128.png"
cp "$OUT/128x128@2x.png" "$ICONSET/icon_128x128@2x.png"
resize 256 "$ICONSET/icon_256x256.png"
cp "$OUT/icon.png" "$ICONSET/icon_256x256@2x.png"
cp "$OUT/icon.png" "$ICONSET/icon_512x512.png"
cp "$MASTER" "$ICONSET/icon_512x512@2x.png"
iconutil -c icns "$ICONSET" -o "$OUT/icon.icns"

echo "→ icon.ico…"
python3 - "$MASTER" "$OUT/icon.ico" <<'PY'
import sys
from pathlib import Path
from PIL import Image

src, dst = map(Path, sys.argv[1:3])
img = Image.open(src).convert("RGBA")
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(dst, format="ICO", sizes=sizes)
PY

echo "Done → $OUT (from tracker-app-icon.png)"
