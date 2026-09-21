# Notes on Causeway, NetcoreNetwork, and the coin

This folder captures what we learned while wrapping the official Causeway CLI (`cwp2p`) in this desktop app, plus a fresh pass over Netcore’s public pages on 20 September 2026.

These notes are for us. They are not official Netcore docs. Where something is a **guess**, it is labeled that way.

## Read in this order

1. [How the pieces fit](how-it-works.md) — Causeway vs NetcoreNetwork, phone book vs data path
2. [Security and trust](security.md) — what they can do today, what they claim for later
3. [Coins, dollars, and fees](coins-and-money.md) — why a coin exists, how it becomes USD, what you might pay for
4. [What to watch for](watch-list.md) — the public signals that would confirm or kill these guesses

## The short version

- **Causeway** is the usable layer: start a daemon, get a 64-character ID, add peers, map `localhost` ports, talk over WireGuard or WebRTC DataChannels.
- **NetcoreNetwork** is the phone book: a globally synced key-value store (RIPSTIK consensus) so two machines can find and authenticate each other.
- After that intro, **application data is supposed to go device-to-device**, not through the blockchain.
- Causeway is on **testnet**. Netcore says the network will be **open sourced at mainnet**.
- They describe NetcoreNetwork as a **decentralized L0/L1 network** with its own cryptocurrency. The coin is meant to pay independent phone-book operators and meter directory writes.
- This desktop app hides the money layer (`charge`, `health-check`). The CLI still talks about **UTXOs**, which only exist if there is a coin.

## Fact vs guess

| Kind | Meaning |
| --- | --- |
| **Fact** | On their website, press, the EE Journal interview, or in `cwp2p` as this repo documents it |
| **Guess** | Best fit from that evidence. Not a published spec |

They have **not** published RIPSTIK, a token ticker, a fee schedule, or a handshake spec.

## Sources we used

- [netcore.network](https://www.netcore.network/)
- [netcore.network/causeway](https://www.netcore.network/causeway)
- [netcore.network/learn](https://www.netcore.network/learn)
- [netcore.network/about](https://www.netcore.network/about)
- [netcore.network/technology](https://www.netcore.network/technology)
- [Introducing Causeway (press)](https://www.netcore.network/press/introducing-causeway)
- [EE Journal interview, 11 Aug 2026](https://www.eejournal.com/article/the-internet-if-a-wants-to-talk-to-b-why-does-c-need-to-be-involved/)
- This repo’s Learn page / CLI notes (`charge`, `health-check`, missing-UTXO warning, `rosterBootstrap`, TURN fields)
