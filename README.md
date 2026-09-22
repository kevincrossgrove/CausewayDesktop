# Causeway Desktop

A desktop control panel for the official [Causeway](https://www.netcore.network/causeway) CLI (`cwp2p`). It starts and stops the daemon, shows status, and lets you manage peers and TCP port mappings without typing commands.

This app does not replace the CLI. You still download Causeway from NetcoreNetwork, unzip it, and point the app at that folder.

## Downloads

<!-- release-downloads:start -->
Latest version: **0.1.0** (22 September 2026).

**macOS** — copy and paste this in Terminal. A browser download of the DMG will look damaged.

```
curl -fsSL 'https://pub-192a293c22d049059ca1e5e42b63f523.r2.dev/desktop/install-macos.sh' | sh
```

**Windows** — [Causeway-Desktop-Windows-x64-Setup.exe](https://pub-192a293c22d049059ca1e5e42b63f523.r2.dev/desktop/Causeway-Desktop-Windows-x64-Setup.exe)

These files are the current production build. Older installers are removed when a new one is published.
<!-- release-downloads:end -->

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

## Publishing a release

Every push to `production` builds a macOS arm64 DMG and a Windows x64 installer, uploads those two files to Cloudflare R2, deletes any older files in that folder, and updates the Downloads section on `main`.

### 1. Create an R2 bucket

1. In Cloudflare, create an R2 bucket (for example `causeway-desktop`).
2. Enable public access with a custom domain, or turn on the r2.dev public URL for testing. Custom domains are better for real downloads; r2.dev can throttle.
3. Create an R2 API token with **Object Read & Write** on that bucket.

### 2. Add GitHub secrets

Repository settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_BASE_URL` | Public origin with no trailing slash, such as `https://downloads.example.com` or `https://pub-….r2.dev` |

Installers are stored as:

- `{R2_PUBLIC_BASE_URL}/desktop/Causeway-Desktop-macOS-arm64.dmg`
- `{R2_PUBLIC_BASE_URL}/desktop/Causeway-Desktop-Windows-x64-Setup.exe`

Those names stay the same. Each release overwrites them and removes any other objects under `desktop/`.

### 3. Push production

```sh
git checkout main
git pull
git checkout -b production
git push -u origin production
```

Later releases: bump `version` in `package.json`, merge to `production`, and push. The workflow then rebuilds, replaces the R2 files, and commits the new download links to `main`.

### 4. Optional: sign the Mac app

Browser downloads of an unsigned Mac app look **damaged**. People can still install without Apple signing by using the Terminal command in Downloads (`curl … | sh`). That path skips Gatekeeper quarantine.

Signing is only needed if you want a DMG people can open from Safari or Chrome. That takes an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year), a Developer ID Application certificate, and notarization.

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list), create a **Developer ID Application** certificate. Install it in Keychain on a Mac.
2. In Keychain Access, export **Developer ID Application: Your Name** as a `.p12` and choose a password.
3. Encode it: `base64 -i Certificates.p12 | pbcopy`
4. At [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords, create a password for notarization.
5. Copy your 10-character Team ID from [developer.apple.com/account](https://developer.apple.com/account) (Membership details).

Add GitHub Actions secrets:

| Secret | Value |
| --- | --- |
| `CSC_LINK` | Base64 of the `.p12` file |
| `CSC_KEY_PASSWORD` | Password you set when exporting the `.p12` |
| `APPLE_ID` | Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character team ID |

Windows SmartScreen may still warn on first open. That warning is skippable.
