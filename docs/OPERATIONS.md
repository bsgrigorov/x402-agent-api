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

Prod host `x402.darkhold.dev` is declared in `apps/api/wrangler.jsonc` (`custom_domain` route on
zone `darkhold.dev`).

### Cloudflare API token (CI)

| Field | Value |
|-------|--------|
| **Name** | `github-x402-agent-api-deploy` (User API token) |
| **Account** | `68dc41440ae5da6f6c21bfb160a117a5` (`CLOUDFLARE_ACCOUNT_ID` secret) |
| **Zone (routes only)** | `darkhold.dev` → `303b8d436bf0bb6ac699d2981511cb1a` |

**Permissions (minimal for deploy-dev / deploy-prod):**

- Account `68dc41440ae5da6f6c21bfb160a117a5`: Workers Scripts Write, D1 Write, Account Settings Read
- Zone `303b8d436bf0bb6ac699d2981511cb1a`: Workers Routes Write

Covers `wrangler deploy` for `x402-agent-api-{dev,prod}`, `x402-agent-ingest-{dev,prod}`, remote D1
migrations, and prod custom domain route. **No IP filter** (GHA egress). Do not reuse
`brslv-mac-automation` in GHA.

**Mint / rotate** (gitignored sibling repo): `x402-challenge/secret/scripts/` — set
`CF_PARENT_API_TOKEN` (User → API Tokens Edit), `CLOUDFLARE_ACCOUNT_ID`, then
`./push-gha-cf-secrets.sh`. Probe: `./test-cf-deploy-token.sh`.

## Public surface (prod)

| Route | Purpose |
|-------|---------|
| `GET /` | HTML landing + OpenGraph (`home.ts`); JSON with `Accept: application/json` |
| `GET /og-image.svg` | Social / Bazaar merchant image |
| `GET /llms.txt`, `GET /.well-known/x402.json` | Agent discovery |
| `POST /v1/brief` | Paid brief (x402 + Bazaar discovery metadata) |

After changing landing or OG copy, redeploy API and run one Mainnet `pnpm e2e:pay-brief` so GoPlausible refreshes merchant metadata.
