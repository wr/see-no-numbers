#!/bin/bash
# Build store-ready zips for Chrome and Firefox.
# Chrome uses manifest.json (service worker background).
# Firefox uses manifest.firefox.json (event page background + gecko settings).
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
FILES="background.js content.js injection.js popup.html popup.js LICENSE"
ICONS="icons/emoji_on_16.png icons/emoji_on_32.png icons/emoji_on_48.png icons/emoji_on_128.png icons/emoji_off_16.png icons/emoji_off_32.png icons/emoji_off_48.png icons/emoji_off_128.png"

rm -rf dist
mkdir -p dist/chrome dist/firefox

for f in $FILES; do cp "$f" dist/chrome/; cp "$f" dist/firefox/; done
mkdir -p dist/chrome/icons dist/firefox/icons
for i in $ICONS; do cp "$i" dist/chrome/icons/; cp "$i" dist/firefox/icons/; done
cp manifest.json dist/chrome/manifest.json
cp manifest.firefox.json dist/firefox/manifest.json

(cd dist/chrome && zip -qr "../see-no-numbers-chrome-v${VERSION}.zip" .)
(cd dist/firefox && zip -qr "../see-no-numbers-firefox-v${VERSION}.zip" .)

echo "Built:"
ls -1 dist/*.zip
