#!/bin/bash
#
# Creates (or refreshes) a "Product Studio.app" launcher on your Desktop.
#
# The app is a thin wrapper: double-clicking it opens Terminal running
# scripts/launch.command, which starts the local server and opens your browser.
# Re-run this any time to rebuild the icon or the bundle.
#
# Usage:  bash scripts/install-desktop-app.sh
#
set -euo pipefail

PROJECT="/Users/noah/Sites/ProductStudio"
APP="$HOME/Desktop/Product Studio.app"
LAUNCH="$PROJECT/scripts/launch.command"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

echo "→ Building app icon…"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Icon source: the favicon's stack mark, inset with a transparent margin so it
# reads as a native macOS app icon.
cat > "$WORK/icon.svg" <<'SVG'
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#283143"/><stop offset="1" stop-color="#11151e"/>
    </linearGradient>
    <radialGradient id="gl" cx="0.5" cy="0.3" r="0.7">
      <stop stop-color="#ffffff" stop-opacity="0.12"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="translate(96,96) scale(25.75)">
    <rect width="32" height="32" rx="7.5" fill="url(#bg)"/>
    <rect width="32" height="32" rx="7.5" fill="url(#gl)"/>
    <path d="M16 7 L25 12 L16 17 L7 12 Z" fill="#eef1f6"/>
    <path d="M7 16 L16 21 L25 16" stroke="#eef1f6" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round" fill="none" opacity="0.62"/>
    <path d="M7 20 L16 25 L25 20" stroke="#eef1f6" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round" fill="none" opacity="0.32"/>
  </g>
</svg>
SVG

if [ ! -x "$CHROME" ]; then
  echo "⚠︎ Google Chrome not found; the app will use the default icon."
else
  "$CHROME" --headless=new --no-first-run --hide-scrollbars \
    --user-data-dir="$WORK/cdp" --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size=1024,1024 \
    --screenshot="$WORK/icon-1024.png" "file://$WORK/icon.svg" >/dev/null 2>&1 || true
  pkill -f "$WORK/cdp" 2>/dev/null || true
fi

ICONSET="$WORK/AppIcon.iconset"
ICNS="$WORK/AppIcon.icns"
if [ -f "$WORK/icon-1024.png" ]; then
  mkdir -p "$ICONSET"
  gen() { sips -z "$1" "$1" "$WORK/icon-1024.png" --out "$ICONSET/$2" >/dev/null; }
  gen 16   icon_16x16.png
  gen 32   icon_16x16@2x.png
  gen 32   icon_32x32.png
  gen 64   icon_32x32@2x.png
  gen 128  icon_128x128.png
  gen 256  icon_128x128@2x.png
  gen 256  icon_256x256.png
  gen 512  icon_256x256@2x.png
  gen 512  icon_512x512.png
  gen 1024 icon_512x512@2x.png
  iconutil -c icns "$ICONSET" -o "$ICNS"
fi

echo "→ Assembling $APP …"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Product Studio</string>
  <key>CFBundleDisplayName</key><string>Product Studio</string>
  <key>CFBundleIdentifier</key><string>com.noahglushien.productstudio.launcher</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

cat > "$APP/Contents/MacOS/launcher" <<LAUNCHER
#!/bin/bash
# Open Terminal running the project launcher (keeps logs + an easy way to stop).
open -a Terminal "$LAUNCH"
LAUNCHER
chmod +x "$APP/Contents/MacOS/launcher"

[ -f "$ICNS" ] && cp "$ICNS" "$APP/Contents/Resources/AppIcon.icns"

# Refresh Finder's icon cache for the new bundle.
touch "$APP"
chmod +x "$LAUNCH" 2>/dev/null || true

echo "✓ Done. Double-click “Product Studio” on your Desktop to launch."
