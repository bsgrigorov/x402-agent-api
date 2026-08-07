# Progress — x402-agent-api

> Living note. Contest research: `kb-projects/projects/algorand-x402-challenge/`.

## 2026-08-06

- Created private GitHub repo `bsgrigorov/x402-agent-api` (confirmed **private**)
- Local path: `~/dev/repos/synkube/x402-challenge/x402-agent-api`
- Cloudflare account pinned: **brslv** / `68dc41440ae5da6f6c21bfb160a117a5` (personal gmail). Account ID is **not a secret** (safe in wrangler.jsonc); OAuth/API tokens are.
- Scaffolded monorepo: `apps/api` + `packages/{feeds,shared}` + GHA + hydrate script
- Separation locked in code:
  - `src/x402` — facilitator client, CAIP-2 networks, Exact AVM scheme, prices, challenge tag
  - `src/brief` — extractive assemble/filter (no HTTP)
  - `src/routes` — HTTP only
  - `src/store` — D1 items + ledger
  - `src/cron` — aggregate + 8-week cleanup

### Testnet wallets (2026-08-06)

Created merchant + payer. **Keys not in git.**

| Role | Address |
|------|---------|
| Merchant (`PAY_TO`) | `BQ3VHAHIZ2LVHS3RPGWTX4JWFJ2WFH5USQOCRIJFKTQ7XUREEKJB5NGPCY` |
| Payer (client E2E) | `L7UAGJP3HMITVMOAKIMF35EIYSWUQUVKEGGPP2ZJYBJ47IR5HJK2ABKDJU` |

Secrets:

- Local (gitignored): `apps/api/.wallets.testnet.json`
- Vault: `~/dev/repos/kb/kb-vault-private/projects/algorand-x402/testnet-wallets.json`

`apps/api/.dev.vars` `PAY_TO` updated to merchant address. Restart wrangler to pick it up.

### Local smoke (confirmed)

| Check | Result |
|-------|--------|
| `pnpm typecheck` / `pnpm test` | green |
| `wrangler d1 migrations apply --local` | ok |
| `GET /health` | 200 |
| `POST /internal/ingest` | 200 |
| `POST /v1/brief` + `x-dev-bypass` | 200 extractive brief |
| `POST /v1/brief` unpaid | **402** |
| Worker → GoPlausible `/supported` | **200** after WARP off |

### Local network note

- Cloudflare WARP was breaking workerd outbound HTTPS (`internal error`). With WARP off, facilitator fetch works. Keep the `/supported` snapshot fallback for Testnet+`DEV_BYPASS_SECRET` as a safety net only.

### Done

- [x] Repo + scaffold (private)
- [x] Pin personal CF `account_id` in wrangler.jsonc
- [x] Health / ingest / brief routes
- [x] x402 middleware (full genesis CAIP-2, lazy init, middleware cache)
- [x] Unit tests for filter + sanitize
- [x] Local smoke: health / 402 / bypass brief
- [x] Confirm Worker HTTPS after WARP off
- [x] Generate Testnet merchant + payer wallets; store privately; wire `PAY_TO`

### Next

- [ ] Fund both wallets with Testnet ALGO (https://lora.algokit.io/testnet/fund)
- [ ] Fund payer with Testnet USDC ASA `10458941` (Circle faucet); merchant opt-in to USDC
- [ ] Restart wrangler; confirm 402 `payTo` is merchant address
- [ ] Paid E2E: client pays → GoPlausible verify/settle → brief 200 (no bypass)
- [ ] Create remote D1 for `dev` / `prod`; replace prod placeholder id
- [ ] Deploy `dev` to workers.dev
- [ ] Re-enable bazaar discovery once Workers-safe (no Ajv codegen)
- [ ] Register for challenge; Mainnet only after Testnet E2E
