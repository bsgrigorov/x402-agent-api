# x402-agent-api

Cloudflare Workers monorepo for Algorand x402 paid agent endpoints.

## Layout

| Path | Responsibility |
|------|----------------|
| `apps/api` | Public resource server (Hono + `@x402/*`) |
| `apps/api/src/x402` | Payment middleware, facilitator, route prices, discovery tag |
| `apps/api/src/brief` | Morning-brief domain logic (filter/assemble; no HTTP, no x402) |
| `apps/api/src/routes` | HTTP handlers only — wire request ↔ domain ↔ store |
| `apps/api/src/store` | D1 access (items + ledger) |
| `apps/api/src/cron` | Wave1 ingest (quotes/feeds/tldr) + 8-week cleanup |
| `packages/aggregator` | Feed adapters + normalize gate (Workers-safe) |
| `packages/feeds` | Wave1 allowlisted feed registry |
| `packages/shared` | Shared types / untrusted-text helpers |

## Commands

```bash
pnpm install
pnpm wallets:generate -- --force --write-dev-vars --vault
pnpm wallets:opt-in
pnpm wallets:check
pnpm db:migrate:local
pnpm dev
pnpm typecheck
```

Wallet / faucet / opt-in runbook: `scripts/README.md`.

Envs: `dev` = Testnet / workers.dev · `prod` = Mainnet / `x402.darkhold.dev` only. See root README.
