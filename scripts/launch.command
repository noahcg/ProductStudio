#!/bin/bash
#
# Product Studio — local launcher.
#
# Boots the app as a local server on your machine (no hosting / no cloud) and
# opens it in your browser. Saves data locally by default, so it needs nothing
# but Node.js. Keep this window open while using the app; press Ctrl-C or close
# it to stop the server.
#
# Double-click works from Finder; the Desktop "Product Studio" app calls this.

set -u

PROJECT="/Users/noah/Sites/ProductStudio"
PORT="4317"
URL="http://localhost:${PORT}"

# --- Make Node available even when launched from Finder (GUI apps get a tiny PATH) ---
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
export PATH="/Users/noah/.nvm/versions/node/v20.20.2/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$PROJECT" || { echo "Project not found at $PROJECT"; read -r -n1 -p "Press any key to close…"; exit 1; }

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js was not found. Install Node 20+ and try again."
  read -r -n1 -p "Press any key to close…"; exit 1
fi

clear
echo "──────────────────────────────────────────────"
echo "  Product Studio"
echo "  ${URL}"
echo "──────────────────────────────────────────────"

# Already running? Just open the browser and exit.
if curl -fsS "$URL" -o /dev/null 2>/dev/null; then
  echo "✓ Already running — opening your browser."
  open "$URL"
  exit 0
fi

# Refresh the production build when app files have changed since the last build.
if [ ! -f ".next/BUILD_ID" ] || [ -n "$(find src public scripts package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs -type f -newer .next/BUILD_ID -print -quit)" ]; then
  echo "Building the latest Product Studio…"
  npm run build || { echo "Build failed."; read -r -n1 -p "Press any key to close…"; exit 1; }
fi

echo "Starting… your browser will open automatically when it's ready."
echo "Keep this window open while you use the app. Press Ctrl-C to stop."
echo

# Open the browser as soon as the server responds.
( for _ in $(seq 1 120); do
    if curl -fsS "$URL" -o /dev/null 2>/dev/null; then open "$URL"; break; fi
    sleep 0.5
  done ) &

# Run the production server in the foreground (Ctrl-C / closing the window stops it).
exec ./node_modules/.bin/next start -p "$PORT"
