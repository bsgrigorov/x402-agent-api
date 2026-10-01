# Making this repository public

Checklist before **Settings → Change visibility → Public** (challenge / open source).

## Must be true

- [ ] No wallet JSON, `.dev.vars`, `prod-ingest-token.txt`, or QR PNGs in git (`git status`, search for `mnemonic`, `privateKeyBase64`).
- [ ] Wrangler secrets (`PAY_TO`, `INGEST_TOKEN`) only in Cloudflare, not in repo.
- [ ] `secret/` and `apps/api/.wallets*` stay **outside** this repo or gitignored (sibling `x402-challenge/secret/` is correct).
- [ ] GitHub Actions: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (see README § Deploy).
- [ ] Review `docs/PROGRESS.md` for personal paths you do not want public (home dirs, email).

## Safe to publish (by design)

- Cloudflare `account_id` in `wrangler.jsonc` (account pin, not credential).
- D1 `database_id` in `wrangler.jsonc` (resource id).
- Mainnet **merchant** address (public `payTo` / leaderboard); do not commit **mnemonics**.
- Testnet addresses in historical notes (on-chain public); rotate if paranoid.
- API hostnames: `x402.darkhold.dev`, `*.darkhold.workers.dev`.

## Recommended before flip

- [x] [LICENSE](../LICENSE) (MIT).
- [x] Short description + topics on GitHub (`algorand`, `x402`, `cloudflare-workers`, `agentic-commerce`).
- [x] README links prod base + `POST /v1/brief`, challenge tag `x402-global-challenge`.
- [x] Run `pnpm typecheck` && `pnpm test` on `main` (CI on push).
- [ ] Optional: enable branch protection on `main` (require CI).

## After public

- [ ] Electric Capital: [open-dev-data PR #3083](https://github.com/electric-capital/open-dev-data/pull/3083) (awaiting merge; see [docs/CHALLENGE.md](./CHALLENGE.md)).
- [x] Challenge [submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) with public repo URL.
- [ ] Do not open issues with logs containing `INGEST_TOKEN` or payment headers.

No API keys or LLM providers in runtime today (`synthesize` disabled).
