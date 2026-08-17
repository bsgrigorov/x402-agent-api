# x402-agent-api

Pay-per-request agent APIs on Algorand x402 (GoPlausible facilitator).

Flagship product: **morning-brief** → `POST /v1/brief`.

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
pnpm db:migrate:remote   # packages/db → same D1
pnpm deploy:dev          # api then ingest (Testnet)
# pnpm deploy:prod       # Mainnet — only after Testnet E2E
# Set INGEST_TOKEN secret on both Workers (api hydrate + ingest run-ingest)
```

Contest research: `~/dev/repos/personal/kb/personal/kb-projects/projects/algorand-x402-challenge/`.

Protocol / trust model: [docs/PROTOCOL.md](./docs/PROTOCOL.md). Progress: [docs/PROGRESS.md](./docs/PROGRESS.md).
