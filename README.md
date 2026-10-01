# x402-agent-api

Pay-per-request agent APIs on Algorand x402 (GoPlausible facilitator). Challenge tag:
`x402-global-challenge`.

Flagship product: **morning-brief** → `POST /v1/brief`. Prod health:
https://x402.darkhold.dev/health

Request/response examples: [docs/API.md](./docs/API.md). Payment wire detail: [docs/PROTOCOL.md](./docs/PROTOCOL.md).

| Env | Network | Host |
|-----|---------|------|
| `dev` | Testnet | `*.workers.dev` |
| `prod` | Mainnet | `x402.darkhold.dev` only |

Workers:

| App | Role |
|-----|------|
| `apps/api` | Paid HTTP (`fetch`) |
| `apps/ingest` | Wave1 cron (`scheduled`) + `POST /internal/run-ingest` |
| `packages/db` | Shared D1 migrations + `items` store (single schema owner) |

## Local

```bash
pnpm install
cp dev.vars.example apps/api/.dev.vars   # set tokens; PAY_TO from wallets:generate
# same INGEST_TOKEN for ingest Worker:
grep '^INGEST_TOKEN=' apps/api/.dev.vars > apps/ingest/.dev.vars
pnpm wallets:generate -- --force --write-dev-vars --vault   # once per env
# fund ALGO → pnpm wallets:opt-in → fund payer USDC → pnpm wallets:check
pnpm db:migrate:local   # via packages/db; shared persist: .wrangler/state
pnpm dev                # API :8787
pnpm dev:ingest         # ingest :8789 (optional for live fetch)
```

Turn **Cloudflare WARP off** before local workerd outbound (`warp-cli disconnect`).

Wallet / opt-in / hydrate runbook: scripts/README.md

Smoke:

```bash
curl -s http://127.0.0.1:8787/health
curl -s -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -d '{"keywords":["kubernetes"],"topics":["tech"]}'
# → 402 without payment

# With local bypass (Testnet / .dev.vars only):
curl -s -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -H "x-dev-bypass: $DEV_BYPASS_SECRET" \
  -d '{"keywords":["kubernetes"],"topics":["tech"]}'
```

Seed items / trigger Wave1 ingest:

```bash
curl -s -X POST http://127.0.0.1:8787/internal/ingest \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"items":[{"url":"https://example.com/a","title":"K8s CVE demo","summary":"Sample","source":"demo","topic":"tech","published_at":"2026-08-06T12:00:00Z"}]}'

# Live fetch+normalize+upsert (ingest Worker :8789):
curl -s -X POST http://127.0.0.1:8789/internal/run-ingest \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"job":"hourly"}'
```

## Deploy

```bash
pnpm db:migrate:remote        # dev D1
pnpm db:migrate:remote:prod   # prod D1
pnpm deploy:dev               # Testnet workers
pnpm deploy:prod              # Mainnet — x402.darkhold.dev only (see scripts/README.md)
```

Set `PAY_TO` + `INGEST_TOKEN` via `wrangler secret` on **both** api and ingest per env.
Mainnet wallet / funding / paid E2E: **scripts/README.md** § Mainnet.

**GitHub Actions** (`.github/workflows/deploy-*.yml`): repo secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` (same account as `account_id` in `wrangler.jsonc`). Create a custom API
token in the Cloudflare dashboard with account **Workers Scripts/Routes** and **D1** Edit, **Account
Settings** Read; then `gh secret set` both names. Optional local helpers (gitignored):
`sibling secret/scripts/push-gha-cf-secrets.sh`. Push to `main` runs dev deploy (migrate + workers);
prod is manual `workflow_dispatch` (type `deploy-prod`).

More: [docs/PROTOCOL.md](./docs/PROTOCOL.md), [docs/PROGRESS.md](./docs/PROGRESS.md),
[docs/PUBLIC.md](./docs/PUBLIC.md) (public-repo checklist), [SECURITY.md](./SECURITY.md).
