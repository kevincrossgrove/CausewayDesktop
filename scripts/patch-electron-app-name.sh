#!/bin/sh
set -e
plist="node_modules/electron/dist/Electron.app/Contents/Info.plist"
[ "$(uname)" = "Darwin" ] || exit 0
[ -f "$plist" ] || exit 0

name="Causeway Desktop"
buddy="/usr/libexec/PlistBuddy"

set_or_add() {
  key="$1"
  if ! "$buddy" -c "Set :$key $name" "$plist" >/dev/null 2>&1; then
    "$buddy" -c "Add :$key string $name" "$plist" >/dev/null
  fi
}

set_or_add CFBundleName
set_or_add CFBundleDisplayName
echo "Set Electron.app display name to $name"
