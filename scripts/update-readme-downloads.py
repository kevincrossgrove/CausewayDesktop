#!/usr/bin/env python3
"""Replace the download block in README.md with the latest published build."""

from __future__ import annotations

import pathlib
import re
import sys

MARKER_START = "<!-- release-downloads:start -->"
MARKER_END = "<!-- release-downloads:end -->"


def main() -> int:
    if len(sys.argv) != 6:
        print(
            "usage: update-readme-downloads.py VERSION DATE MAC_URL WIN_URL INSTALL_URL",
            file=sys.stderr,
        )
        return 2

    version, date, mac_url, win_url, install_url = sys.argv[1:]
    readme_path = pathlib.Path("README.md")
    text = readme_path.read_text(encoding="utf-8")
    block = "\n".join(
        [
            MARKER_START,
            f"Latest version: **{version}** ({date}).",
            "",
            "**macOS** — copy and paste this in Terminal. A browser download of the DMG will look damaged.",
            "",
            "```",
            f"curl -fsSL '{install_url}' | sh",
            "```",
            "",
            f"**Windows** — [{win_url.rsplit('/', 1)[-1]}]({win_url})",
            "",
            "These files are the current production build. Older installers are removed when a new one is published.",
            MARKER_END,
        ]
    )
    pattern = re.compile(re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END), re.S)
    new_text, count = pattern.subn(block, text, count=1)
    if count != 1:
        print("README.md is missing the release-downloads markers.", file=sys.stderr)
        return 1

    readme_path.write_text(new_text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
