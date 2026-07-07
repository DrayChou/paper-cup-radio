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
  IM_CMD=()
fi

has_prebuilt_icons() {
  [[ -f "$ICONS_DIR/app.ico" && -f "$ICONS_DIR/app.png" && -f "$ICONS_DIR/tray.png" ]]
}

can_render_svg() {
  [[ ${#IM_CMD[@]} -gt 0 ]] || return 1
  local probe_png="$BUILD_DIR/.icon-probe.png"
  rm -f "$probe_png"
  if "${IM_CMD[@]}" -background none "$ICONS_DIR/app.svg" -resize 32x32 "PNG32:$probe_png" >/dev/null 2>&1; then
    rm -f "$probe_png"
    return 0
  fi
  rm -f "$probe_png"
  return 1
}

render() {
  local size="$1"
  "${IM_CMD[@]}" -background none "$ICONS_DIR/app.svg" -resize "${size}x${size}" "PNG32:$BUILD_DIR/app-${size}.png"
}

if ! can_render_svg; then
  if has_prebuilt_icons; then
    echo "SVG rendering unavailable; reusing committed icon artifacts in $ICONS_DIR"
    exit 0
  fi

  if [[ ${#IM_CMD[@]} -eq 0 ]]; then
    echo "Neither 'magick' nor 'convert' is available, and no prebuilt icons were found." >&2
  else
    echo "ImageMagick is installed but cannot render $ICONS_DIR/app.svg, and no prebuilt icons were found." >&2
  fi
  exit 127
fi

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
