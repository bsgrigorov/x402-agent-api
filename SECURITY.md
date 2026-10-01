# Security

## Reporting

If you find a vulnerability in this project, email the repository owner (see GitHub profile)
rather than opening a public issue. Do not include production `INGEST_TOKEN`, wallet
mnemonics, or live payment headers in reports.

## Secrets

- **Never commit:** Algorand mnemonics, `INGEST_TOKEN`, `DEV_BYPASS_SECRET`, Cloudflare API tokens.
- **Cloudflare Workers:** `PAY_TO` and `INGEST_TOKEN` via `wrangler secret put` only.
- **CI:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions (README § Deploy).

## Scope

This is a pay-per-request HTTP API on Algorand x402. Trust boundaries: unpaid callers (402),
paid settlement via GoPlausible, bearer auth on `/internal/*` ingest paths.
