# x402-agent-api

Pay-per-request agent APIs on Algorand x402 (GoPlausible facilitator).

Flagship product: **morning-brief** → `POST /v1/brief`.

| Env | Network | Host |
|-----|---------|------|
| `dev` | Testnet | `*.workers.dev` |
| `prod` | Mainnet | `x402.darkhold.dev` only |

## Local

```bash
pnpm install
cp dev.vars.example apps/api/.dev.vars   # set PAY_TO, tokens
pnpm db:migrate:local
pnpm --filter @x402-agent-api/api dev
```

Smoke:

```bash
curl -s http://127.0.0.1:8787/health
curl -s -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -d '{"keywords":["kubernetes"],"sections":["tech"]}'
# → 402 without payment

# With local bypass (Testnet / .dev.vars only):
curl -s -X POST http://127.0.0.1:8787/v1/brief \
  -H 'content-type: application/json' \
  -H "x-dev-bypass: $DEV_BYPASS_SECRET" \
  -d '{"keywords":["kubernetes"],"sections":["tech"]}'
```

Seed items:

```bash
curl -s -X POST http://127.0.0.1:8787/internal/ingest \
  -H "authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"items":[{"url":"https://example.com/a","title":"K8s CVE demo","summary":"Sample","source":"demo","section":"tech","published_at":"2026-08-06T12:00:00Z"}]}'
```

## Deploy

```bash
pnpm deploy:dev    # Testnet
# pnpm deploy:prod # Mainnet — only after Testnet E2E
```

Contest research: `~/dev/repos/kb/kb-projects/projects/algorand-x402-challenge/`.
