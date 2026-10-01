# Progress — x402-agent-api

> Living note. Contest research lives outside this repo (internal KB).

## 2026-08-06

- GitHub repo `bsgrigorov/x402-agent-api`
- Repo: `x402-agent-api` (monorepo root)
- Cloudflare account pinned in `wrangler.jsonc` (`68dc41440ae5da6f6c21bfb160a117a5`). Account ID is **not a secret**; API tokens are.
- Scaffolded monorepo: `apps/api` + `packages/{feeds,shared}` + GHA + hydrate script
- Separation locked in code:
  - `apps/api` — paid HTTP (`fetch`); ledger/payments in `src/store`
  - `apps/ingest` — Wave1 cron (`scheduled`) + `POST /internal/run-ingest`
  - `packages/db` — D1 migrations + `items` accessors (schema owner)
  - `src/x402` / `src/brief` / `src/routes` — payment + brief + HTTP wiring

### Testnet wallets (2026-08-06)

Merchant + payer generated; keys only in gitignored `apps/api/.wallets.testnet.json`. Payer rotated
2026-08-07; merchant unchanged.

Secrets:

- Local (gitignored): `apps/api/.wallets.testnet.json`
- Optional age-encrypted vault copy (local; never committed)

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

### Local network note (WARP)

- **Turn Cloudflare WARP off** before local `wrangler` / workerd outbound (`pnpm dev`, facilitator probe, Wave1 `run-ingest`). WARP yields workerd `internal error; reference = …` on HTTPS fetch even when host `curl` works.
- Disconnect: `warp-cli disconnect` (status should show Disconnected/Paused). Also clear `HTTP(S)_PROXY` if set.
- Keep the `/supported` snapshot fallback for Testnet+`DEV_BYPASS_SECRET` as a safety net only.

### 2026-08-07 — Wave1 promote

- Schema: `0003_topics_kind.sql` (`section`→`topic`, `kind`/`external_id`/`payload`)
- Packages: `packages/aggregator` + `packages/feeds` Wave1 allowlist; brief API `topics`
- Cron: hourly quotes+feeds, TLDR every 6h, cleanup daily; `POST /internal/run-ingest`
- Local verified (WARP off): quotes 9/9, feeds 28/29, tldr 6/6 → D1 → bypass brief 200 / unpaid 402

### 2026-08-07 — Split ingest Worker

- `packages/db` owns migrations; api + ingest bind same D1 `database_id`
- Local persist shared at repo `.wrangler/state` (`--persist-to`)
- Crons removed from `apps/api`; live on `apps/ingest` only
- Free plan: **one** hourly cron on ingest (`0 * * * *`); fans out tldr (hour%6) + cleanup (hour===5)
- Deployed: `x402-agent-api-dev` + `x402-agent-ingest-dev.darkhold.workers.dev`
- Remote E2E (2026-08-07): ingest hourly+tldr OK → bypass brief 200 → paid settle `V4XEQLXO…` + brief 200


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
- [x] Replay reject: `payment_claims` UNIQUE on payment-header hash → **409**
- [x] Harden `INGEST_TOKEN` (≥32 + timing-safe compare); rotated local + CF `dev`

### 2026-10-01 — Mainnet prod

- Mainnet wallets in sibling `secret/` (gitignored); prod D1 + migrations; `x402-agent-api-prod` on `x402.darkhold.dev`; ingest prod + cron
- Paid Mainnet E2E + multi-pay smoke (`e2e:pay-brief --count`); script fixes (mainnet CAIP-2 register, `wallets:check` explorer + network infer)
- Ops runbook: `scripts/README.md` § Mainnet

### 2026-10-01 — Bazaar + challenge attribution

- Bazaar `declareDiscoveryExtension` on `POST /v1/brief` (`brief-discovery.ts`); validated in unit test
- Mainnet catalog: `/discovery/resources` + leaderboard `src=bazaar` / `x402-global-challenge` (24h window)
- Electric Capital [open-dev-data PR #3083](https://github.com/electric-capital/open-dev-data/pull/3083) opened

### 2026-10-01 — Prod landing (Bazaar branding)

- `apps/api/src/routes/home.ts`: HTML landing at `GET /` (OpenGraph, `/og-image.svg`); JSON index with `Accept: application/json`
- Deployed prod API + ingest; live https://x402.darkhold.dev/

### 2026-10-01 — Landing polish (favicon, OG PNG, security headers)

- Favicon routes (`/favicon.ico`, `/favicon.svg`), `/og-image.png` for social crawlers, `robots.txt`
- Hono `secureHeaders` + tighter CORS methods; HTML meta (Twitter, og:type, theme-color)
- Deployed prod (`x402-agent-api-prod`); securityheaders-grade headers verified live
- `GET /` content negotiation: HTML for `*/*` and preview bots; JSON only with `Accept: application/json`

### 2026-10-01 — Narrow GHA Cloudflare token + prod route in wrangler

- User API token **`github-x402-agent-api-deploy`**: account Workers Scripts + D1 + zone Workers
  Routes on `darkhold.dev` only (see `docs/OPERATIONS.md`)
- `apps/api/wrangler.jsonc`: prod `custom_domain` route for `x402.darkhold.dev`
- GHA secret updated; local deploy verified with minted token

### Next

- [x] `CLOUDFLARE_API_TOKEN` (`github-x402-agent-api-deploy`) + `CLOUDFLARE_ACCOUNT_ID` in GitHub secrets
- [x] Make repo public (`docs/PUBLIC.md`)
- [ ] Electric Capital `open-dev-data` PR merged ([#3083](https://github.com/electric-capital/open-dev-data/pull/3083), opened 2026-10-01)
- [x] Challenge [submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) (submitted 2026-10-01)
- [x] Bazaar discovery extension on Worker
- [x] Leaderboard / Bazaar check (GoPlausible)
- [ ] Brief polish; OpenRouter when `synthesize` ships
- [ ] Drive non-self Mainnet usage (judging / DEV bucket)
