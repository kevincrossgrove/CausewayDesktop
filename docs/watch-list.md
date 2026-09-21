# What to watch for

Public material still does not include a fee schedule, a token ticker, or a protocol spec. These are the signals that would confirm or kill the notes in this folder.

## Fees and the coin

Confirming **directory writes cost coins**, not per-peer billing:

- Language about paying to **register an ID**, **update an endpoint**, or **refresh presence**
- A wallet, faucet, or “credit” screen in Causeway or this desktop app
- Mainnet docs that mention **gas**, **UTXOs**, or a minimum balance on the ID
- Relay **bandwidth pricing**

Killing the guess:

- A flat monthly subscription with no token
- Explicit “adding a peer costs N coins”
- They ship mainnet with **no** coin and **no** other operator-payment story

## Security claims becoming checkable

- **Open source** of NetcoreNetwork (they said this happens at mainnet)
- How a NetcoreNetwork ID is derived (hash of a public key vs a mutable name)
- Whether `cwp2p` **binds the handshake to that ID**
- Who runs relays and whether they **forward** WireGuard/DataChannels or **terminate** them
- RIPSTIK paper or spec: Byzantine threshold, who the first node set is, the bandwidth resource barrier

Until those exist, treat “they cannot impersonate your friend” as a **design claim**.

## Decentralization in practice

- A public **node-operator** program and real non-Netcore nodes in `status` counts
- Whether `rosterBootstrap` still points only at company machines
- Independent people actually **selling earned coins for USD** (a market), not only testnet seeds

If mainnet launches and Netcore still runs most nodes, the phone book is still their infrastructure with extra steps.

## This desktop app

If we need to surface any of this in the UI later:

- Missing-UTXO / recovery warnings already parsed from `status`
- Do **not** promote `charge` / `health-check` as normal user tools unless the product actually requires them
- Never display private keys
- Keep state in the app data folder so we do not collide with a Terminal daemon’s identity

## Sources to re-check

- [Causeway FAQ](https://www.netcore.network/causeway) — testnet / mainnet / L0–L1 line
- [Learn](https://www.netcore.network/learn) — phone book vs data path
- [Press: Introducing Causeway](https://www.netcore.network/press/introducing-causeway)
- [EE Journal](https://www.eejournal.com/article/the-internet-if-a-wants-to-talk-to-b-why-does-c-need-to-be-involved/) — Bella on “did you just move C?”
