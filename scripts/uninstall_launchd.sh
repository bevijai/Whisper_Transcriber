#!/bin/bash
set -euo pipefail
# Uninstall the launchd plist and stop the service

PLIST_DST="$HOME/Library/LaunchAgents/com.whisper.local.plist"

if [ -f "$PLIST_DST" ]; then
  echo "Unloading LaunchAgent..."
  launchctl unload "$PLIST_DST" 2>/dev/null || true
  rm -f "$PLIST_DST"
  echo "Removed $PLIST_DST"
else
  echo "No installed plist at $PLIST_DST"
fi
