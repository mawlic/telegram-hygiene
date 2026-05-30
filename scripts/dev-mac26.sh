#!/bin/bash
set -e

echo "→ Building..."
npx electron-vite build

echo "→ Packaging..."
./node_modules/.bin/electron-builder --dir --mac

echo "→ Signing with entitlements..."
codesign --force --deep --sign - \
  --entitlements "$(dirname "$0")/entitlements.plist" \
  "dist/mac-arm64/Telegram Hygiene.app"

echo "→ Launching..."
open "dist/mac-arm64/Telegram Hygiene.app"

echo "✓ App launched. Watching for changes..."
# Watch src/ and rebuild + relaunch on change
while true; do
  fswatch -1 src/ 2>/dev/null && \
    npx electron-vite build && \
    ./node_modules/.bin/electron-builder --dir --mac 2>/dev/null && \
    codesign --force --deep --sign - \
      --entitlements "$(dirname "$0")/entitlements.plist" \
      "dist/mac-arm64/Telegram Hygiene.app" 2>/dev/null && \
    pkill -f "Telegram Hygiene" 2>/dev/null; sleep 1; \
    open "dist/mac-arm64/Telegram Hygiene.app"
done
