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
| Payer (client E2E) | `JWDOA6JEA4KOGBX6AOHROPJICSFWOXTOZ5AHB4QNZRTJ72VGCKFDV3SWNE` |

Payer rotated 2026-08-07 (old `L7UAGJP3…` retired after Circle send before opt-in). Merchant unchanged.

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
- [x] Opt both accounts into USDC ASA `10458941` (merchant + payer); balances still 0 USDC
- [x] Ops scripts + runbook: `scripts/{generate-wallets,opt-in-usdc,check-accounts,hydrate}.ts`, `scripts/README.md`
- [x] Paid E2E local: `pnpm e2e:pay-brief` → settle OK + brief 200 (tx `TZ5GGUCQ…`)
- [x] `PROTOCOL.md` control-flow + facilitator trust model
- [x] Remote D1 `x402-agent-api-dev` + migrate; secrets `PAY_TO`/`INGEST_TOKEN`; deploy
- [x] Remote smoke (IPv4): `GET /health` → 200, unpaid `POST /v1/brief` → **402**
- [x] Remote hydrate + paid E2E on darkhold.workers.dev
  - settle tx `GRIG2RW4MTCY3SHRG7FSEDAAS4GTC2RVYQXOLIXFL5MG2SIKH4OQ`, brief **200**

### Next

- [ ] Re-enable bazaar discovery once Workers-safe (no Ajv codegen)
- [ ] Register for challenge; Mainnet only after custom domain / Mainnet wallets
