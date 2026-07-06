#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ICONS_DIR="$ROOT_DIR/icons"
BUILD_DIR="$ICONS_DIR/build"
ICONSET_DIR="$BUILD_DIR/RemoteInputHost.iconset"

mkdir -p "$BUILD_DIR" "$ICONSET_DIR"

if command -v magick >/dev/null 2>&1; then
  IM_CMD=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM_CMD=(convert)
else
  echo "Neither 'magick' nor 'convert' is available. Please install ImageMagick." >&2
  exit 127
fi

render() {
  local size="$1"
  "${IM_CMD[@]}" -background none "$ICONS_DIR/app.svg" -resize "${size}x${size}" "PNG32:$BUILD_DIR/app-${size}.png"
}

for size in 16 32 64 128 256 512 1024; do
  render "$size"
done

cp "$BUILD_DIR/app-16.png" "$ICONSET_DIR/icon_16x16.png"
cp "$BUILD_DIR/app-32.png" "$ICONSET_DIR/icon_16x16@2x.png"
cp "$BUILD_DIR/app-32.png" "$ICONSET_DIR/icon_32x32.png"
cp "$BUILD_DIR/app-64.png" "$ICONSET_DIR/icon_32x32@2x.png"
cp "$BUILD_DIR/app-128.png" "$ICONSET_DIR/icon_128x128.png"
cp "$BUILD_DIR/app-256.png" "$ICONSET_DIR/icon_128x128@2x.png"
cp "$BUILD_DIR/app-256.png" "$ICONSET_DIR/icon_256x256.png"
cp "$BUILD_DIR/app-512.png" "$ICONSET_DIR/icon_256x256@2x.png"
cp "$BUILD_DIR/app-512.png" "$ICONSET_DIR/icon_512x512.png"
cp "$BUILD_DIR/app-1024.png" "$ICONSET_DIR/icon_512x512@2x.png"

if command -v iconutil >/dev/null 2>&1; then
  iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/app.icns"
else
  echo "iconutil not found, skip app.icns generation"
fi

"${IM_CMD[@]}" "$BUILD_DIR/app-256.png" -define icon:auto-resize=16,24,32,48,64,128,256 "$ICONS_DIR/app.ico"
cp "$BUILD_DIR/app-512.png" "$ICONS_DIR/app.png"
cp "$BUILD_DIR/app-32.png" "$ICONS_DIR/tray.png"

echo "Icons generated in $ICONS_DIR"
