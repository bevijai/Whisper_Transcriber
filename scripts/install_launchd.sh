#!/bin/bash
set -euo pipefail
# Install and load the launchd plist for the local Whisper server

PLIST_SRC="$(pwd)/launchd/com.whisper.local.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.whisper.local.plist"

if [ ! -f "$PLIST_SRC" ]; then
  echo "Missing $PLIST_SRC" >&2
  exit 1
fi

cp "$PLIST_SRC" "$PLIST_DST"
chmod 644 "$PLIST_DST"

echo "Loading LaunchAgent..."
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"
echo "Loaded. Check logs at launchd/server.log and launchd/server.err in the repo."
