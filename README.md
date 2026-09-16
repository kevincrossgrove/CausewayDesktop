# Causeway Desktop

A desktop control panel for the official [Causeway](https://www.netcore.network/causeway) CLI (`cwp2p`). It starts and stops the daemon, shows status, and lets you manage peers and TCP port mappings without typing commands.

This app does not replace the CLI. You still download Causeway from NetcoreNetwork, unzip it, and point the app at that folder.

## Requirements

- Node.js 22 or later
- The Causeway CLI for your machine:
  - macOS arm64: unzip and keep `cwp2p` in that folder (`chmod +x cwp2p` if needed)
  - Windows amd64: unzip and keep `cwp2p.exe` in that folder. For WireGuard mode, keep WinTUN next to it.

## First run

1. Download Causeway from [netcore.network/causeway](https://www.netcore.network/causeway) and unzip it. Do not select the `.zip` file in the app.
2. Install and start this project:

```sh
npm install
npm run dev
```

3. Connect the unzipped Causeway folder when the setup screen appears.
4. Start Causeway from the Status page. Your local ID and a `cwp2p peer add` command appear once the daemon is up.

The app looks for a folder named `causeway` or `Causeway` on the Desktop or in Downloads and offers it if the binary is there.

## What you can do

- **Status** — start and stop the daemon, copy your local ID, and copy a share command for the other machine
- **Peers** — add, list, and remove peers
- **Ports** — add or remove TCP mappings (`local-port:remote-port`)
- **Connection** — choose WireGuard (default) or DataChannels. Both machines must use the same mode
- **Learn** — CLI command reference and a link to the docs

Settings cover appearance, bind address (`--bind-address`), and log level (`--log-level`). Restart Causeway after changing bind address or log level.

Quitting while Causeway is running asks for confirmation, then stops the daemon so peers disconnect cleanly.

## Development

```sh
npm run dev          # Electron + Vite
npm run typecheck    # TypeScript for main and renderer
npm run build        # typecheck + production bundle
```

Runtime files live in `~/.causeway-desktop` (`cwp2p.json` state and `cwp2p.sock`).

## Packaging

```sh
npm run build:mac    # macOS arm64 DMG
npm run build:win    # Windows x64 installer
npm run build:unpack # unpacked app in release/
```

Installers land in `release/`.
