# x402-agent-api

Cloudflare Workers monorepo for Algorand x402 paid agent endpoints.

## Layout

| Path | Responsibility |
|------|----------------|
| `apps/api` | Public resource server (Hono + `@x402/*`) — `fetch` only |
| `apps/ingest` | Wave1 cron Worker — one hourly `scheduled` (fans out tldr/cleanup) + `POST /internal/run-ingest` |
| `apps/api/src/x402` | Payment middleware, facilitator, route prices, discovery tag |
| `apps/api/src/brief` | Morning-brief domain logic (filter/assemble; no HTTP, no x402) |
| `apps/api/src/routes` | HTTP handlers only — wire request ↔ domain ↔ store |
| `apps/api/src/store` | Ledger + payment claims (API-only) |
| `packages/db` | **Schema owner**: D1 migrations + `items` accessors |
| `packages/aggregator` | Feed adapters + normalize gate (Workers-safe) |
| `packages/feeds` | Wave1 allowlisted feed registry |
| `packages/shared` | Shared types / untrusted-text helpers |

Both Workers bind the **same** D1 `database_id` and point `migrations_dir` at `packages/db/migrations`. Migrate only via `@x402-agent-api/db`.

## Commands

```bash
pnpm install
pnpm wallets:generate -- --force --write-dev-vars --vault
pnpm wallets:opt-in
pnpm wallets:check
pnpm db:migrate:local
pnpm dev            # API :8787
pnpm dev:ingest     # ingest :8789 (shared local D1 via ../../.wrangler/state)
pnpm typecheck
pnpm deploy:dev     # api then ingest
```

Local: turn **Cloudflare WARP off** before workerd outbound (`warp-cli disconnect`).

Wallet / faucet / opt-in runbook: `scripts/README.md`.

Envs: `dev` = Testnet / workers.dev · `prod` = Mainnet / `x402.darkhold.dev` only. See root README.
