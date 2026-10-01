# x402 Morning Brief

**Project name (challenge):** x402-morning-brief · **Repo:** x402-agent-api

Pay-per-request **morning intel brief** for agents and developers: call one HTTPS endpoint, pay in
USDC on **Algorand Mainnet** via [x402](https://www.x402.org/) and [GoPlausible](https://facilitator.goplausible.xyz/), get a keyword-ranked multi-topic brief with source links. No API keys or subscriptions.

| | |
|---|---|
| **Live API** | https://x402.darkhold.dev |
| **Paid route** | `POST /v1/brief` — **$0.05 USDC** per request |
| **Network** | Algorand Mainnet (Exact AVM, USDC ASA `31566704`) |
| **Challenge** | Tag `x402-global-challenge` on payment requirements |
| **Leaderboard `payTo`** | `KXAFUQLFJJH7SOY5MYSO2RK3A5LDKKFTZJV3GIEIX2HHKJDEYR7MX7KN4Q` |

## What it does

1. Client sends `POST /v1/brief` with topics/keywords (JSON).
2. Without payment → **402** + `PAYMENT-REQUIRED` (price, `payTo`, network).
3. Client signs USDC; GoPlausible **verify** + **settle** on Algorand.
4. Server returns **200** with an extractive brief built from ingested news/quotes in D1 (cron ingest Worker).

## Try it (unpaid)

```bash
curl -s https://x402.darkhold.dev/
curl -s -X POST https://x402.darkhold.dev/v1/brief \
  -H 'content-type: application/json' \
  -d '{"keywords":["kubernetes"],"topics":["tech"]}'
# → HTTP 402 (payment required)
```

Paid flow (wallet + x402 client): see [docs/API.md](./docs/API.md) and [docs/PROTOCOL.md](./docs/PROTOCOL.md).  
Machine-readable: `GET /.well-known/x402.json`, `GET /llms.txt`.

## Architecture

| Component | Role |
|-----------|------|
| `apps/api` | Public x402 HTTP API (`POST /v1/brief`) |
| `apps/ingest` | Hourly feed/quotes ingest → D1 |
| `packages/db` | D1 schema + migrations |

Hosted on **Cloudflare Workers**; facilitator `https://facilitator.goplausible.xyz`.

## Documentation

| Doc | Audience |
|-----|----------|
| [docs/API.md](./docs/API.md) | Request/response, errors |
| [docs/PROTOCOL.md](./docs/PROTOCOL.md) | x402 trust model, payment flow |
| [docs/OPERATIONS.md](./docs/OPERATIONS.md) | Local dev, deploy, CI |
| [scripts/README.md](./scripts/README.md) | Wallets, funding, E2E scripts |
| [SECURITY.md](./SECURITY.md) | Reporting vulnerabilities |

## Links

- GitHub: https://github.com/bsgrigorov/x402-agent-api
- Health: https://x402.darkhold.dev/health
- GoPlausible leaderboard (merchants, Mainnet): https://facilitator.goplausible.xyz/dashboard/leaderboards?cat=merchants&env=mainnet
