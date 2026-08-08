# Ops scripts — wallets, hydrate, local smoke

These are **repeatable** helpers for a new environment / wallet set. Secrets stay in
gitignored files under `apps/api/` (and optionally kb-vault-private). Scripts never
commit keys.

| Script | pnpm | Purpose |
|--------|------|---------|
| `generate-wallets.ts` | `pnpm wallets:generate` | Create merchant + payer keys |
| `rotate-payer.ts` | `pnpm wallets:new-payer` | Replace payer only (keep merchant) |
| `opt-in-usdc.ts` | `pnpm wallets:opt-in` | Opt accounts into USDC ASA |
| `check-accounts.ts` | `pnpm wallets:check` | Show ALGO / USDC / opt-in status |
| `e2e-pay-brief.ts` | `pnpm e2e:pay-brief` | Paid settle → `POST /v1/brief` (no bypass) |
| `hydrate.ts` | `pnpm hydrate` | POST seed items to `/internal/ingest` |

Defaults:

- Wallets file: `apps/api/.wallets.testnet.json` (override with `WALLETS_FILE` or `--file` / `--out`)
- Vault copy: `~/dev/repos/kb/kb-vault-private/projects/algorand-x402/testnet-wallets.json`
- Algod: AlgoNode public Testnet/Mainnet

---

## Fresh Testnet setup (new deployment / new wallets)

### 1. Generate wallets

```bash
pnpm wallets:generate -- --force --write-dev-vars --vault
```

- Writes `apps/api/.wallets.testnet.json` (mode 600, gitignored)
- Copies to kb-vault-private when `--vault`
- Sets `PAY_TO=<merchant>` in `apps/api/.dev.vars` when `--write-dev-vars`

Addresses only are printed. Open the JSON file locally for mnemonics.

### 2. Fund ALGO

Both merchant and payer need Testnet ALGO (fees + min balance + ASA opt-in raises min balance):

- https://lora.algokit.io/testnet/fund

### 3. Opt into USDC

Algorand cannot receive an ASA until the account **opts in** (creates a local holding).
Having ALGO, or “adding a token” in a wallet UI, does not always mean the chain holding exists.

```bash
pnpm wallets:opt-in
# or one role:
pnpm wallets:opt-in -- --role merchant
pnpm wallets:opt-in -- --role payer
```

### 4. Fund payer USDC

**Order matters:** opt-in (step 3) **before** Circle faucet. If you faucet first, the send fails and Circle rate-limits (~2h). Use `pnpm wallets:new-payer` to rotate payer if stuck.

Circle Testnet faucet → Algorand Testnet → **payer** address, ASA `10458941`:

- https://faucet.circle.com/

Merchant can stay at 0 USDC; it only needs the opt-in so settle can credit it.

### Rotate payer only (keep merchant / PAY_TO)

```bash
pnpm wallets:new-payer -- --vault
# fund ALGO on the NEW payer
pnpm wallets:opt-in -- --role payer
# THEN Circle USDC faucet
pnpm wallets:check
```

### 5. Verify

```bash
pnpm wallets:check
```

Expect: both `opted_in_usdc: true`, payer `usdc > 0`.

### 6. Local API

```bash
pnpm db:migrate:local
pnpm dev
# restart after changing .dev.vars so PAY_TO reloads
```

Smoke:

```bash
curl -s http://127.0.0.1:8787/health
curl -s -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -d '{"keywords":["kubernetes"],"topics":["tech"]}'
# → 402; PAYMENT-REQUIRED.payTo must equal merchant address
```

Hydrate sample items (optional, for extractive brief). Token must be ≥32 chars
(`openssl rand -hex 32`); same value in `.dev.vars` and `wrangler secret`:

```bash
INGEST_TOKEN="$(grep '^INGEST_TOKEN=' apps/api/.dev.vars | cut -d= -f2-)" \
BASE_URL=http://127.0.0.1:8787 \
  pnpm hydrate -- --file ./scripts/seed.example.json

# Live Wave1 ingest (ingest Worker on :8789; use {"job":"tldr"} for TLDR expand):
# pnpm dev:ingest
curl -s -X POST http://127.0.0.1:8789/internal/run-ingest \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"job":"hourly"}'
```

### 7. Paid E2E

```bash
# ensure pnpm dev is running, then:
INGEST_TOKEN="$(grep '^INGEST_TOKEN=' apps/api/.dev.vars | cut -d= -f2-)" \
BASE_URL=http://127.0.0.1:8787 \
  pnpm hydrate -- --file ./scripts/seed.example.json
pnpm e2e:pay-brief
```

Expect: settle `success: true`, brief HTTP 200, payer USDC decreased by ~$0.05.

---

## Mainnet (later)

```bash
WALLETS_FILE=./apps/api/.wallets.mainnet.json \
  pnpm wallets:generate -- --network mainnet --i-understand-mainnet --out ./apps/api/.wallets.mainnet.json

pnpm wallets:opt-in -- --network mainnet --i-understand-mainnet \
  --file ./apps/api/.wallets.mainnet.json
```

USDC Mainnet ASA is `31566704`. Never put Mainnet `PAY_TO` on `*.workers.dev`.

---

## Cloudflare notes

- `account_id` in `wrangler.jsonc` is not a secret; pin the personal account.
- `.dev.vars` / wallet JSON / OAuth tokens stay local.
- Local workerd outbound HTTPS can break with Cloudflare WARP on — turn WARP off for `wrangler dev`.
