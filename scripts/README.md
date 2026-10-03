# Ops scripts — wallets, hydrate, local smoke

These are **repeatable** helpers for a new environment / wallet set. Secrets stay in
gitignored paths (`apps/api/.wallets*.json`, sibling `../ops/` age + QRs, kb-vault-private).
Scripts never commit keys or print mnemonics. Mainnet: `../ops/scripts/with-wallets.sh`.

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
- Vault (age-encrypted): optional; path from `wallets:generate --vault` / your vault layout
- Live plaintext (gitignored, stays in project): `apps/api/.wallets.testnet.json`
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

`e2e-pay-brief` picks **Testnet vs Mainnet** from the wallet file `network` field
(`algorand-testnet` / `algorand-mainnet`). Optional: `--count N`, `--quiet` (log tx ids only).

---

## Mainnet (challenge / prod)

**Network:** Algorand **Mainnet** only (not Base/Ethereum). **USDC** = ASA **`31566704`**.

**Host:** `https://x402.darkhold.dev` only — never set Mainnet `PAY_TO` on `*.workers.dev`.

Mainnet keys: `../ops/wallets.mainnet.json.age` (see `../ops/scripts/README.md`).

### 1. Generate wallets (merchant + payer)

Two keys: **merchant** = `PAY_TO` (keep for whole contest); **payer** = local paid E2E only.

```bash
cd x402-agent-api
pnpm wallets:generate -- --network mainnet --i-understand-mainnet \
  --out ../ops/wallets.mainnet.json
```

`wallets:generate` prints addresses + AlgoKit explorer URLs (no secrets). Then `../ops/scripts/secrets-pack.sh` (also copies `.age` to kb-vault-private).

### 2. Fund ALGO (both addresses)

Send **~2–10 ALGO** on **Algorand Mainnet** to **merchant** and **payer** (exchange withdraw
or Algorand-native wallet). Needed for min balance, fees, and opt-in txs.

### 3. Opt into USDC (both addresses)

**After** ALGO lands:

```bash
../ops/scripts/with-wallets.sh wallets:opt-in -- --i-understand-mainnet
```

Network is inferred from the wallet file (`algorand-mainnet`). Override with `--network mainnet|testnet`.

### 4. Fund USDC (payer only)

Send **Algorand Mainnet USDC** (ASA 31566704) to the **payer** only (~$1–2 for smoke tests;
`$0.05 × N` for N self-payments). Merchant can stay at **0 USDC**; it **receives** payments.

| Role | ALGO | USDC |
|------|------|------|
| Merchant | Yes | Receive only (opt-in required) |
| Payer | Yes | Yes (you pay the API) |

### 5. Verify

```bash
../ops/scripts/with-wallets.sh wallets:check
```

Infers mainnet from the wallet file; output includes `explorer` (AlgoKit Lora).  
Pera: `https://explorer.perawallet.app/accounts/<address>`.

### 6. Prod platform (once per env)

```bash
# D1 (if not created): wrangler d1 create x402-agent-api-prod — wire database_id in wrangler.jsonc
pnpm db:migrate:remote:prod
# wrangler secret put PAY_TO / INGEST_TOKEN on api + ingest prod workers
pnpm deploy:prod
```

Prod ingest (populate D1 before a useful brief):

```bash
INGEST_TOKEN="$(../ops/scripts/read-ingest-token.sh)"
curl -sS -X POST "https://x402-agent-ingest-prod.darkhold.workers.dev/internal/run-ingest" \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"job":"hourly"}'
```

### 7. Paid E2E on Mainnet

```bash
BASE_URL=https://x402.darkhold.dev ../ops/scripts/with-wallets.sh e2e:pay-brief

# Volume smoke (leaderboard); not a substitute for organic usage
BASE_URL=https://x402.darkhold.dev ../ops/scripts/with-wallets.sh e2e:pay-brief -- --count 5 --quiet
```

Expect: `success: true`, merchant USDC +$0.05 per call, payer USDC −$0.05 per call.

### Challenge checklist

Full checklist: [docs/CHALLENGE.md](../docs/CHALLENGE.md).

- [x] Mainnet prod + GoPlausible + Bazaar discovery + `x402-global-challenge` tag
- [x] [Submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) (submitted 2026-10-01)
- [x] Public repo + landing/OG at https://x402.darkhold.dev/
- [ ] Electric Capital [open-dev-data PR #3083](https://github.com/electric-capital/open-dev-data/pull/3083) merged
- [ ] Organic Mainnet usage (avoid self-pay loops for judging; see [troubleshooting](https://algorand.co/blog/is-your-x402-endpoint-showing-up-in-the-facilitator-leaderboard-how-to-troubleshoot-if-not))

---


## Cloudflare notes

- GHA: `CLOUDFLARE_API_TOKEN` (`github-x402-agent-api-deploy`, scoped per `docs/OPERATIONS.md`) +
  `CLOUDFLARE_ACCOUNT_ID` repo secrets.
- `account_id` in `wrangler.jsonc` is not a credential; API tokens stay in env / GitHub secrets.
- `.dev.vars` / wallet JSON / OAuth tokens stay local.
- Local workerd outbound HTTPS can break with Cloudflare WARP on — turn WARP off for `wrangler dev`.
