# Operations (developers)

Repo layout for agents: [AGENTS.md](../AGENTS.md). Wallets, Mainnet funding, E2E:
[scripts/README.md](../scripts/README.md).

## Local dev

```bash
pnpm install
cp dev.vars.example apps/api/.dev.vars
grep '^INGEST_TOKEN=' apps/api/.dev.vars > apps/ingest/.dev.vars
pnpm wallets:generate -- --force --write-dev-vars   # Testnet; see scripts/README.md
pnpm db:migrate:local
pnpm dev          # API :8787
pnpm dev:ingest   # ingest :8789
```

Turn **Cloudflare WARP off** for local workerd HTTPS (`warp-cli disconnect`).

## Deploy

```bash
pnpm db:migrate:remote        # dev D1
pnpm db:migrate:remote:prod   # prod D1
pnpm deploy:dev
pnpm deploy:prod              # Mainnet — x402.darkhold.dev
```

Secrets: `PAY_TO`, `INGEST_TOKEN` via `wrangler secret` on api + ingest per env.

## GitHub Actions

Workflows: `deploy-dev.yml` (push to `main`), `deploy-prod.yml` (`workflow_dispatch`, confirm
`deploy-prod`). Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Prod custom domain is attached in the Cloudflare dashboard (not in `wrangler.jsonc` routes) so
account-scoped CI tokens work.
