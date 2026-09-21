# Coins, dollars, and fees

Netcore markets a unique, fast L0–L1 cryptocurrency as the thing that makes the network **economically feasible**: independent people run phone-book nodes because they can get paid.

The coin is **not** the video, the file, or the peer list. It is the ticket for the **directory**.

## Why a coin at all

A global phone book still needs:

1. **Someone to run nodes** (power, bandwidth, uptime)
2. **A cost to write**, or bots flood the directory

A native token is the usual answer: users spend tickets, operators earn tickets, operators sell tickets for dollars to pay rent.

Consensus copy (**fact**): designed around **useful network participation**, not proof of work or proof of stake.

## What the CLI already admits

This desktop app does not put these on the main toolbar. They are still in `cwp2p`:

| Command | What it does |
| --- | --- |
| `cwp2p charge <value>` | Test-net helper. Spends one **canonical seed UTXO into the local ID**. Value is a base-10 unsigned number ≥ 43 |
| `cwp2p health-check` | Probes nodes, may refresh bootstrap / blacklist. **Consumes** seed UTXOs |
| `cwp2p status` | Can show a **missing-UTXO** recovery warning until restart |

**Fact:** UTXOs mean a coin-shaped ledger, even if there is no public ticker yet.

**Guess:** `charge` is a faucet/bootstrap: take a known seed output and attach spendable balance to this machine’s ID. Health-check burning UTXOs is “lookups/probes cost something so spam controls get tested.”

Seed UTXOs are **play money**. There is no honest USD market for them.

## Do you need coins to use Causeway?

**Now:** no purchase. The sandbox funds participation.

**If they launch the economy they describe:** someone pays for directory writes. That someone might be you, the app (hidden credit), or Netcore’s treasury. Strict “zero coins forever on a self-funding mainnet” does not match the pitch.

You should **not** assume you will day-trade just to add a friend. You **should** assume the directory will not stay free *and unpaid* if operators are really paid in the token.

## What you would pay for (**guess**)

Coins pay for **directory writes**, not for “owning a friendship.”

| Action | Coin? |
| --- | --- |
| Add / remove a peer | **No.** Local config. You already have their ID; you look them up |
| First time the ID is published | **Yes.** “Here I am.” |
| Your IP changes (new Wi-Fi, sleep/wake, travel) | **Yes.** “I moved.” |
| Live tunnel already up, neither side moved | **No.** That session is not on-chain |
| Relay because NAT blocked a direct path | **Maybe**, by usage |

A home desktop with a stable IP would spend almost nothing. A laptop that hops networks all day would spend more.

**Watch for:** fees on ID / IP **updates**, not a per-peer price list. That is the tell. See [What to watch for](watch-list.md).

## If you sell the coins

Selling leftover coins is not hanging up a call.

- **Active tunnel** should keep going until the machines drop.
- **Peer list** is on disk, not a balance.
- **Emptying the ID** (no UTXOs left) may not kill today’s session, but the next “please find me again” write can fail. That matches a missing-UTXO warning.

The ID is a key on the machine. Coins are spendable outputs **attached** to it. Losing the state file kills the identity whether or not coins remain.

## Why would anyone *buy* coins?

**Utility:** you need a **ticket** to write to the shared directory (announce online, update address, maybe pay a relay). If Causeway is worth using instead of Tailscale / a cloud relay, some people will pay a little for that stamp.

**Everyone else is a bet:** speculators, operators who must hold/stake, the company keeping a market alive.

If nobody needs the ticket, the coin has no use value. Then the only reason to buy is hoping someone else will.

## How crypto becomes USD

The protocol **never prints dollars**. It mints a token.

USD appears only when **someone who already has dollars buys the coin from you** (an exchange, OTC, the company, another operator).

Typical path for a node operator:

1. Run a machine, earn coins
2. Sell coins on a market
3. Buyer pays USD (or a dollar-pegged token, then cash out to a bank)

If nobody bids, the coin is unsold inventory, not “worth” dollars.

The circular story: users buy tickets with dollars → spend tickets on the phone book → operators earn tickets → operators sell tickets for dollars to pay power. If real demand is missing, it is just speculation until the buyers leave.

## What this app should not pretend

We do not show a wallet, a ticker, or `charge` as a primary tool. That matches the product: people should add peers, not think about tokens — until mainnet makes the money layer unavoidable.
