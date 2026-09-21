# Security and trust

The useful question is not “is it decentralized on the brochure?” It is **who can lie, who can read, and what you have to trust today.**

## Two different risks

| Risk | Meaning |
| --- | --- |
| **Directory / intro** | They send you to the wrong machine, or learn who looks up whom |
| **Data path** | They see or change your files, camera, or `localhost` app |

Netcore’s pitch is: the phone book can help you **meet**; it should not **carry the conversation**. That is only as strong as identity checks in `cwp2p`.

## What they have said in public (**fact**)

From Learn, the homepage, the press release, and the [EE Journal interview](https://www.eejournal.com/article/the-internet-if-a-wants-to-talk-to-b-why-does-c-need-to-be-involved/):

- Each device can have its own **cryptographic identity**.
- The network helps you find **where a trusted peer is** and get what you need to connect **securely**.
- After that, they do **not** sit in the middle of the video (their camera example).
- Bella was asked: haven’t you just moved “C” from AWS to Netcore? She said **no**: there is not a single Netcore-owned meeting server; RIPSTIK is leaderless BFT; many independent nodes; users need not run one.
- Relays exist for NAT, and they say coordination **and** fallback are not under one operator.
- Homepage: “trustless connectivity platform.”

They have **not** published the ID format, the handshake, or the relay encryption details.

## Can someone who runs the phone book “interject”?

**Yes, at introduction.** Anyone who can answer “where is this ID?” can:

- point you at the wrong IP
- delay or drop lookups
- see **metadata** (who looked up whom, from which networks)

That is the same class of power as a DNS host or a Tailscale coordination server.

**Whether they can silently read the session** depends on key binding:

**Guess, if it is built the usual way:** the 64-character ID is a fingerprint of a key that lives in your local state file. You paste a friend’s ID out of band. The daemon checks that the machine you reached can prove it owns that ID. A lying directory then just fails the handshake — wrong door, no private key.

**If identity is “whatever the ledger currently says,”** and one party can rewrite the ledger, then a MITM of the intro is real.

We cannot verify which of those `cwp2p` actually does.

## Trust today vs trust later

**Today you are trusting Netcore a lot.** Causeway is closed-source. You run their daemon on your machine. It holds keys, can map localhost ports, and talks to their nodes and TURN servers. They operate testnet.

If they wanted your stuff, they would not need a clever phone-book MITM. The binary is already on the computer.

Treat current use like a **beta from a company you have to trust**. Don’t share anything over it you would not give that company.

**Later, if mainnet matches the pitch**, security is supposed to look like:

1. **ID = crypto identity on the device**, keys stay local. Directory answers *where*, not *who*.
2. **RIPSTIK / BFT** so one dishonest node (even a Netcore node) cannot rewrite the book. Greg’s origin paper was BFT with a **bandwidth resource barrier** (anti-sybil: you should not cheaply fake a majority).
3. **Data path stays E2E** (WireGuard / DataChannels). Relays forward ciphertext, they do not terminate the tunnel.
4. **Open source** so you can check that (1)–(3) are real.

Load-bearing assumptions we have not seen proven:

- ID is really a key fingerprint, not a mutable directory nickname
- `cwp2p` checks that on every connect
- enough independent mainnet nodes that Netcore cannot quietly run a majority
- relays do not terminate the tunnel

If those hold, the directory can **grief** you (wrong address, downtime, metadata). It should not **impersonate** a peer whose ID you already have.

## Practical habits in this app

- Keep `cwp2p.json` private. It is the identity.
- This app’s state lives in its own application data folder, not next to the unzipped CLI, so a Terminal daemon and this app are different identities.
- The UI never shows private keys. Leave it that way.
- TURN password, STUN/TURN server lists, and `rosterBootstrap` are in the state JSON if you ever need to reason about *who* you are asking for a path.
