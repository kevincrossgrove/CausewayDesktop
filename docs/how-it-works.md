# How the pieces fit

## Two products, one stack

| Piece | What it is | What you touch in this app |
| --- | --- | --- |
| **Causeway (`cwp2p`)** | CLI / SDK / control plane. Generates your ID, adds peers, maps TCP ports, opens a tunnel | Status, Peers, Ports, Connection, Learn |
| **NetcoreNetwork** | The coordination network Causeway runs on | Shown as node count, your NetcoreNetwork ID, recovery warnings |

Netcore’s Causeway FAQ (**fact**):

> Causeway runs on NetcoreNetwork, our decentralized L0/L1 network. NetcoreNetwork provides the underlying discovery and coordination layer that allows peers to find and authenticate each other.

This desktop app does not replace `cwp2p`. It starts and stops that binary and talks to it over a socket.

## Phone book vs conversation

Before two machines can talk, each needs to know:

1. **Who** the other is (identity)
2. **Where** they are right now (IP / endpoint), even after Wi-Fi changes
3. How to **prove** the machine at that address really owns that identity

That is the phone book. Netcore describes it as a **globally synchronized key-value store**. Nodes around the world keep a shared view of network state. Consensus is **RIPSTIK**: leaderless, aimed at useful participation rather than proof of work or proof of stake.

Learn page (**fact**):

> For Causeway, the primary role of NetcoreNetwork is simple: help devices discover where their peers are and verify who they are connecting to. Once that coordination is complete, application data moves directly between the devices rather than through the blockchain or a centralized relay.

So:

- **Directory traffic** (find me, authenticate me) → NetcoreNetwork
- **Your actual stuff** (a `localhost:3000` app, a file, a camera) → supposed to go **A ↔ B** over WireGuard or DataChannels

Relays exist as a fallback when NAT or firewalls block a direct path. Netcore says those relays are decentralized too, not one company in the middle.

## What a user actually does

1. Install Causeway, run the daemon (this app can do that).
2. Get a **64-character lowercase hex** NetcoreNetwork ID.
3. Exchange IDs with the other person (chat, the share command on Status, etc.).
4. Each adds the other as a peer. The tunnel can come up even with no port mappings.
5. To share an app that stays on one machine at `http://127.0.0.1:3000`, the **computer that wants the app** adds a mapping like `3000:3000`. The computer **running** the app does not add that mapping; in WireGuard mode it may need to **open that local port for peers** on Ports.

Both machines must use the same connection mode (WireGuard or DataChannels).

## Always-on machines still exist

Direct data does **not** mean nobody runs servers.

The phone book needs **always-on nodes** with public addresses. Your laptop sleeping cannot be the only copy of the global directory. Fresh installs know where to start via `rosterBootstrap` in the state JSON. Status shows **active NetcoreNetwork node count**.

**Guess:** on testnet those nodes are mostly Netcore’s. On mainnet they want many independent operators, paid in the native coin. Users are not required to run a node just to connect (EE Journal, Bella’s answer).

## How this shows up in the CLI

| Signal | Why it matters |
| --- | --- |
| `cwp2p status` → NetcoreNetwork ID, node count, public endpoint, NAT | You are a record in their directory |
| Missing-UTXO recovery warning | The ID is tied to on-chain coins, not just a random string |
| `cwp2p charge` | Test-net helper: spend a seed UTXO **into** the local ID |
| `cwp2p health-check` | Probe nodes, update blacklist / bootstrap; **consumes** seed UTXOs |
| State fields `rosterBootstrap`, `netCoreNodeBlacklist`, STUN/TURN | Phone book + NAT traversal, including a built-in TURN password |

This UI never shows private keys. The state file (`cwp2p.json`) is the identity. Keep it private. This app stores it under its own application data folder so a Terminal daemon and this app do not share an identity.

## Testnet vs mainnet

Causeway FAQ (**fact**):

> The underlying network, NetcoreNetwork, will be open sourced when we move to mainnet. Causeway is currently running on testnet.

| | Testnet (now) | Mainnet (claimed later) |
| --- | --- | --- |
| Money | Toy UTXOs / seed coins | Real native coin, if they launch one |
| Who runs nodes | Effectively the company | Independent operators, if the economics work |
| Can they reset it? | Yes | Not without breaking the real network |
| Code | Closed | They say the network will be open |

Testnet is a practice network. It is not a finished public blockchain. You can use Causeway without buying anything because they are still running the sandbox.

## L0 / L1, in their wording

They are not saying “we settle on Ethereum.” **L0/L1** here means **their own base chain + native asset**: a fast coordination ledger, not Bitcoin-style proof of work.

“Lightning-fast” in marketing lines up with claims elsewhere: RIPSTIK, seconds-not-hours state updates (they contrast this with DNS), a “real-time responsive blockchain” on the About page.
