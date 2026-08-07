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
cp dev.vars.example apps/api/.dev.vars   # set tokens; PAY_TO from wallets:generate
pnpm wallets:generate -- --force --write-dev-vars --vault   # once per env
# fund ALGO → pnpm wallets:opt-in → fund payer USDC → pnpm wallets:check
pnpm db:migrate:local
pnpm dev
```

Wallet / opt-in / hydrate runbook: scripts/README.md

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

Protocol / trust model: [PROTOCOL.md](./PROTOCOL.md).
