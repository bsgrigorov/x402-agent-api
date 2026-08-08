# x402 control flow — x402-agent-api

How this repo implements Algorand x402 (Exact AVM) with GoPlausible, and what is trusted by whom.

## Actors

| Actor | What it is here | Trust role |
|-------|-----------------|------------|
| **Client / payer** | Agent or `pnpm e2e:pay-brief` using payer wallet | Signs USDC payment; loses funds if it pays a malicious `payTo` |
| **Resource server (merchant)** | This Worker (`apps/api`) on localhost or Cloudflare | Declares price/`payTo`; decides when to fulfill after verify/settle |
| **Facilitator** | `https://facilitator.goplausible.xyz` | Verifies payload vs requirements; submits/settles on-chain; fee-payer on AVM groups |
| **Algorand Testnet/Mainnet** | Public chain + USDC ASA | Source of truth for balances and settlement |
| **D1** | Cloudflare SQLite (items + ledger) | Merchant-private store; not part of payment trust |
| **Feeds / Circle faucet** | RSS sources; Testnet USDC faucet | Ops only; not on the payment critical path |

GoPlausible is **permissionless for verify/settle**: no merchant signup, API key, or domain allowlist is required for the Worker to call `/verify` and `/settle`. Discovery/bazaar indexing (if used later) is a separate concern from settlement trust.

---

## Sequence (paid `POST /v1/brief`)

```mermaid
sequenceDiagram
  autonumber
  participant C as Client / payer wallet
  participant M as Merchant Worker
  participant F as GoPlausible Facilitator
  participant A as Algorand + USDC ASA
  participant D as D1 items / ledger

  C->>M: POST /v1/brief unpaid
  M-->>C: 402 + PAYMENT-REQUIRED

  Note over C: Client builds Exact AVM payment matching accepts[]

  C->>M: POST /v1/brief + PAYMENT-SIGNATURE
  M->>F: POST /verify
  F->>A: Check signed group vs requirements
  F-->>M: verify ok / fail

  alt verify fail
    M-->>C: 402 again
  else verify ok
    M->>D: build extractive brief
    M->>F: POST /settle
    F->>A: Submit USDC payer to payTo
    F-->>M: settle success + tx id
    M->>D: append revenue_events
    M-->>C: 200 brief JSON + PAYMENT-RESPONSE
  end
```

Unpaid local smoke can short-circuit with Testnet-only `x-dev-bypass` (never on Mainnet). That path does **not** talk to the facilitator.

---

## Wire formats: `accepts[]` → signature → `/verify`

This is the concrete meaning of “Client builds Exact AVM payment matching `accepts[]`.” Headers are base64(JSON). Shapes come from `@x402/core` v2 + `@x402/avm` Exact scheme; this Worker builds them via `@x402/hono` from `apps/api/src/x402/middleware.ts`.

### End-to-end

```text
1. Client → Merchant: POST /v1/brief (no payment)
2. Merchant → Client: 402 + PAYMENT-REQUIRED = base64(PaymentRequired)
3. Client picks one accepts[] row, builds Exact AVM txn group, signs payer leg
4. Client → Merchant: same POST + PAYMENT-SIGNATURE = base64(PaymentPayload)
5. Merchant → Facilitator: POST /verify { paymentPayload, paymentRequirements }
6. If valid → fulfill → POST /settle → 200 + PAYMENT-RESPONSE
```

### 1. Merchant `PAYMENT-REQUIRED` (decoded)

Route config (`scheme: exact`, `price`, CAIP-2 `network`, `PAY_TO`, `extra.asset` / `extra.tag`) is turned into requirements. Facilitator `GET /supported` supplies `extra.feePayer`, which Exact AVM server merges into `accepts[]`.

Testnet example (`BRIEF_PRICE_USDC=0.05` → atomic `50000`):

```json
{
  "x402Version": 2,
  "error": "Payment required",
  "resource": {
    "url": "http://127.0.0.1:8787/v1/brief",
    "description": "Keyword-filtered multi-section intel brief...",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      "amount": "50000",
      "asset": "10458941",
      "payTo": "<MERCHANT_PAY_TO>",
      "maxTimeoutSeconds": 60,
      "extra": {
        "asset": "10458941",
        "tag": "x402-global-challenge",
        "feePayer": "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA"
      }
    }
  ]
}
```

GoPlausible’s AVM fee-payer / settlement signer (confirmed via live `/supported`) is that `ZMFK2OI7…` address. Inspect locally:

```bash
curl -sD - -o /dev/null -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -d '{"keywords":["kubernetes"],"sections":["tech"]}'
# decode the PAYMENT-REQUIRED header: base64 -d | jq .
```

### 2. Client `PAYMENT-SIGNATURE` (decoded)

`pnpm e2e:pay-brief` uses `wrapFetchWithPayment` + `ExactAvmScheme`: decode 402 → select one `accepts[]` entry → `createPaymentPayload` → set header.

Exact AVM group construction:

| Step | What happens |
|------|----------------|
| Fee-payer leg | If `extra.feePayer` set: 0-ALGO self-pay from facilitator, **unsigned** by client |
| Payment leg | ASA transfer `payer → payTo`, amount/asset from requirements; fee=0 when sponsored |
| Group | Shared atomic group ID |
| Sign | Client signs only indexes where `sender === payer` |
| Encode | Each txn → base64 msgpack bytes in `paymentGroup` |

HTTP payload (v2):

```json
{
  "x402Version": 2,
  "resource": { "url": "...", "description": "...", "mimeType": "application/json" },
  "accepted": { /* exact copy of the chosen accepts[] entry */ },
  "payload": {
    "paymentGroup": [
      "<base64 unsigned fee-payer txn>",
      "<base64 signed ASA transfer>"
    ],
    "paymentIndex": 1
  }
}
```

`PAYMENT-SIGNATURE` is `base64(JSON.stringify(that))`. On AVM this is a **signed txn group**, not an EIP-712 signature string. `accepted` is the requirements snapshot the client paid against; that binding is what makes verify work.

### 3. Merchant → facilitator `/verify`

Merchant does not invent new requirements. `@x402/hono` / `@x402/core`:

1. Decode `PAYMENT-SIGNATURE` → `paymentPayload`
2. Rebuild current route `accepts`
3. `findMatchingRequirements(accepts, paymentPayload)` must match `paymentPayload.accepted`
4. POST to facilitator:

```http
POST https://facilitator.goplausible.xyz/verify
Content-Type: application/json

{
  "x402Version": 2,
  "paymentPayload": { /* decoded PAYMENT-SIGNATURE */ },
  "paymentRequirements": { /* matching accepts[] entry */ }
}
```

Same body shape for `/settle` after the handler. Success: `{ "isValid": true, "payer": "<addr>" }`. Failure: `isValid: false` + `invalid_exact_avm_*`.

### 4. Why verify is “guaranteed” (and what is not)

Not URL allowlisting. Cryptographic + structural matching:

| Check | Who | Proves |
|-------|-----|--------|
| Scheme/network = Exact AVM | Facilitator | Right payment kind |
| `paymentPayload.accepted` ≈ `paymentRequirements` | Merchant middleware + facilitator | Price/`payTo` cannot change after client signed |
| Txn amount / receiver / ASA | Facilitator | Exact USDC transfer to merchant |
| Payer signature valid | Facilitator | Only key holder authorized transfer |
| Fee-payer leg only completable by facilitator | Facilitator | Sponsored gas is safe |
| Simulation + settle broadcast | Facilitator + chain | Opt-in, balances, group validity |

Prerequisites for settle success: client signed the 402’s `accepts[]`, merchant still advertises the same requirements, payer has USDC + ASA opt-in, merchant `PAY_TO` opted into USDC.

Not covered by verify alone: brief product quality; honesty of `payTo` in the original 402 (client must pin/trust before signing); Worker replay of the same header (D1 `payment_claims` → 409). Facilitator settle remains the money gate; D1 is metering.

### Mental model

```text
accepts[]  ──(client copies)──►  accepted  ──(merchant echoes)──►  paymentRequirements
                                        │
                                        ▼
                              signed Algorand group
                              (payload.paymentGroup)
                                        │
                                        ▼
                                   /verify then /settle
```

---

## Component view

```mermaid
flowchart LR
  subgraph Clients
    Agent[Agent / curl / e2e script]
  end

  subgraph Merchant["Merchant (this repo)"]
    Edge[Hono routes]
    X402[src/x402 middleware]
    Brief[src/brief extractive]
    Store[src/store D1]
    Cron[src/cron RSS + cleanup]
  end

  subgraph ThirdParty["Third parties"]
    GP[GoPlausible facilitator]
    Algo[Algorand + Circle USDC ASA]
    Feeds[Public RSS feeds]
    CF[Cloudflare Workers + D1]
  end

  Agent -->|HTTP 402 / paid retry| Edge
  Edge --> X402
  X402 -->|/supported /verify /settle| GP
  GP --> Algo
  X402 -->|grant after settle| Brief
  Brief --> Store
  Cron --> Feeds
  Cron --> Store
  Edge --> CF
  Store --> CF
```

---

## What the facilitator actually checks

On `/verify` and `/settle`, GoPlausible cares about the **payment object**, not about whether your hostname is “approved”:

1. **Scheme + network** match a supported Exact AVM kind (CAIP-2 + `exact`).
2. **Signed Algorand transaction group** is well-formed (amounts, asset ASA id, receiver = `payTo`, timeouts, optional fee-payer leg).
3. **Requirements** the merchant sent in the verify/settle body match what the client signed against (so the merchant cannot silently change price after the client signed).
4. On settle: broadcast/confirm on-chain; return tx id.

It does **not**:

- Call back to `http://127.0.0.1:8787` or your `*.workers.dev` URL to “validate the site”.
- Require HTTPS on the merchant for settlement to work (local HTTP works; production should still be HTTPS for clients).
- Hold USDC (non-custodial relative to merchant/payer balances).

So: **trust in the facilitator is cryptographic + on-chain**, not URL/domain allowlisting.

---

## How trust is established (who trusts what)

### 1. Client → Merchant

- Client trusts the **HTTP endpoint it chose** to return honest `PAYMENT-REQUIRED` (`payTo`, price, asset).
- Protection: TLS (in prod) reduces MitM on the 402 header; the client should still verify `payTo` / amount before signing (agents: pin known merchants).
- Paying the wrong `payTo` is irreversible once settled.

### 2. Merchant → Facilitator

- Merchant trusts GoPlausible’s HTTPS API (`FACILITATOR_URL`) to correctly verify and settle.
- Merchant authenticates to the facilitator **by speaking the public HTTP API** (no API key in this setup). Anyone can call `/verify`/`/settle` with a valid payload.
- Merchant must use HTTPS to the facilitator so MitM cannot forge verify/settle responses (Workers/`fetch` to `https://facilitator.goplausible.xyz`).

### 3. Facilitator → Merchant URL

- **Does not need to trust or reach your URL** for verify/settle.
- The `resource.url` inside `PAYMENT-REQUIRED` is **metadata for clients/discovery** (what was paid for). Settlement validity is independent of that string being publicly reachable.
- That is why **local `http://127.0.0.1:8787` E2E works**: the Worker initiates outbound calls *to* the facilitator; the facilitator never needs inbound access to localhost.

### 4. Facilitator / chain → Wallets

- **Payer** must sign; **merchant `PAY_TO`** must be opted into USDC ASA or receive fails.
- GoPlausible may appear as **feePayer** in `extra` / supported kinds so groups can be fee-abstracted; that is chain-level cooperation, not merchant domain trust.

### 5. Challenge / discovery tag

- `extra.tag = x402-global-challenge` is an application/contest signal for indexing and dashboards.
- It is **not** what authorizes settle. Listing in a bazaar may later involve crawling `https://…` endpoints; that is discovery reputation, separate from payment validity.

### 6. Cloudflare deployment

| Layer | What it proves |
|-------|----------------|
| `*.workers.dev` HTTPS | Cloudflare terminates TLS for that hostname; clients get transport integrity to *that* Worker |
| Custom domain (`x402.darkhold.dev`) | Same + DNS you control; still not a facilitator allowlist |
| Wrangler `account_id` | Which CF account owns the Worker/D1 — infra auth, unrelated to x402 settle |
| D1 binding | Merchant data plane only |

Facilitator still only sees: HTTPS requests from the Worker’s egress with payment payloads.

---

## Local vs deployed (same protocol)

```text
Local:   Client ──HTTP──► wrangler dev :8787 ──HTTPS──► GoPlausible ──► Algorand Testnet
Deploy:  Client ──HTTPS─► *.workers.dev     ──HTTPS──► GoPlausible ──► Algorand Testnet
```

Differences that matter:

- **TLS to merchant**: recommended in prod for clients; not required for facilitator settle.
- **Secrets**: `PAY_TO`, `INGEST_TOKEN` via `.dev.vars` locally / `wrangler secret` remotely. Never commit.
- **`DEV_BYPASS_SECRET`**: Testnet/local unpaid shortcut only; must be unset on Mainnet.
- **Network env**: `dev` → Testnet CAIP-2 + USDC `10458941`; `prod` → Mainnet + `31566704` on `x402.darkhold.dev` only.

---

## Data after a successful pay

1. USDC moves **payer → `PAY_TO`** on Algorand (facilitator-reported tx id).
2. Worker writes `revenue_events` (and extractive `cost_events`) in D1.
3. Response body is the morning-brief product; payment proof may also appear in settlement response headers.

Replay / double-fulfill: D1 `payment_claims` UNIQUE on sha256(`payment-signature` / `x-payment`). Replay → **409** before brief build. Key is the payment header hash because `@x402/hono` settles *after* the handler (settle tx id is not available yet). Facilitator settle remains the money gate; D1 ledger is the metering mirror.

---

## Ops pointers

- Wallet / opt-in / E2E: [../scripts/README.md](../scripts/README.md)
- Progress checklist: [PROGRESS.md](./PROGRESS.md)
- HTTP examples: [API.md](./API.md)
- Facilitator concept (upstream): [GoPlausible facilitator docs](https://github.com/GoPlausible/x402-avm/blob/main/docs/core-concepts/facilitator.md)
