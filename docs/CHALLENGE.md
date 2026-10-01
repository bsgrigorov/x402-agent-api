# Global x402 Challenge — admin checklist

Official program: [Global x402 Challenge](https://algorand.co/global-x402-challenge) · [Build & submit guide](https://algorand.co/blog/the-x402-global-challenge-is-live-how-to-build-submit-your-entry) · [Official rules (PDF)](https://algorand.co/hubfs/x402%20competition%20Official%20Rules.pdf)

## Technical qualification (this repo)

| Requirement | Status |
|-------------|--------|
| Mainnet HTTPS endpoint | https://x402.darkhold.dev |
| GoPlausible facilitator | `FACILITATOR_URL` in prod Worker |
| Bazaar discovery on paid route | `apps/api/src/x402/brief-discovery.ts` |
| Tag `x402-global-challenge` | `extra.tag` in payment middleware |
| Public GitHub with Algorand/x402 code | https://github.com/bsgrigorov/x402-agent-api |
| Bazaar + leaderboard visibility | Verify via facilitator discovery + `src=bazaar` / `x402-global-challenge` |

## Algorand Foundation submission form

Project details + repo URL: [submission form](https://fjtqz.share-eu1.hsforms.com/2VnFVCiF_Sg26XP85Jxz_bA) (window per challenge page; submitted 2026-10-01).

## Electric Capital (step 7 in AF guide)

**What it is:** Electric Capital maintains the [open-dev-data](https://github.com/electric-capital/open-dev-data) taxonomy used in developer-ecosystem reporting. The Algorand challenge guide asks entrants to **register the public GitHub repo** there as part of qualification — this is **not** the same as the HS submission form or x402-foundation protocol PRs.

**What you need:** A **public** repo with relevant Algorand/x402 code (already true).

**How to submit:** Open a PR to `electric-capital/open-dev-data` that adds this repo under the **Algorand** ecosystem (see merged examples: `repadd` migration DSL in that repo’s docs). Typical entry:

- Repo: `https://github.com/bsgrigorov/x402-agent-api`
- Tags: e.g. `#x402` `#agentic-commerce` `#cloudflare-workers`

Electric Capital reviews and merges on their schedule; absence from open-dev-data does **not** block GoPlausible settle or Bazaar listing.

## Merchant branding (Bazaar)

Facilitator reads **domain metadata** for merchant cards:

- HTML + OpenGraph at `GET /` (browsers / crawlers)
- `GET /og-image.svg` — public logo image URL
- `GET /llms.txt`, `GET /.well-known/x402.json`
- Route `description` in payment middleware (Bazaar catalog text)

After changing OG/HTML, trigger **one more Mainnet settle** so GoPlausible refreshes merchant metadata.

## Leaderboard filters

Use dashboard **SOURCE** = `BAZAAR` or `X402-GLOBAL-CHALLENGE` and a **recent range** (e.g. 24h). Older settles before Bazaar/tag may remain under `DIRECT` on `range=all`.

Self-service `e2e` pays from the same wallet are real settles but may not count as “organic” usage for judging; see [leaderboard troubleshooting](https://algorand.co/blog/is-your-x402-endpoint-showing-up-in-the-facilitator-leaderboard-how-to-troubleshoot-if-not).
