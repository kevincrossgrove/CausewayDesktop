#!/bin/sh
set -euo pipefail

# Replaced at publish time with the current R2 URL. curl does not quarantine
# the download, so this installs without an Apple Developer ID.
dmg_url="__MAC_DMG_URL__"
dest="/Applications/Causeway Desktop.app"

if [ "$(uname)" != "Darwin" ]; then
  echo "This installer is for macOS." >&2
  exit 1
fi

tmp="$(mktemp -d)"
mount=""
cleanup() {
  if [ -n "$mount" ]; then
    hdiutil detach "$mount" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp"
}
trap cleanup EXIT

echo "Downloading Causeway Desktop…"
curl -fL "$dmg_url" -o "$tmp/Causeway-Desktop.dmg"

mount="$(hdiutil attach -nobrowse -readonly "$tmp/Causeway-Desktop.dmg" | awk -F$'\t' '/\/Volumes\//{print $NF}' | tail -n 1)"
if [ -z "$mount" ]; then
  echo "Could not mount the disk image." >&2
  exit 1
fi

app="$(find "$mount" -maxdepth 1 -name '*.app' -print | head -n 1)"
if [ -z "$app" ]; then
  echo "No .app found in the disk image." >&2
  exit 1
fi

echo "Installing to $dest"
rm -rf "$dest"
cp -R "$app" "$dest"
xattr -cr "$dest" >/dev/null 2>&1 || true
open "$dest"
echo "Installed Causeway Desktop."
