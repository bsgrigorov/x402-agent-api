# API reference — morning-brief

Public resource server: `apps/api` (x402 Exact AVM via GoPlausible).

| Env | Base URL |
|-----|----------|
| `dev` (Testnet) | `https://x402-agent-api-dev.darkhold.workers.dev` |
| `prod` (Mainnet) | `https://x402.darkhold.dev` |

Payment protocol detail: [PROTOCOL.md](./PROTOCOL.md). Agent layout: [../AGENTS.md](../AGENTS.md).

---

## `POST /v1/brief`

Keyword-ranked multi-topic intel brief with citations. Default path is **extractive** (no LLM). Unpaid requests return **402** + `PAYMENT-REQUIRED`.

### Request

```http
POST /v1/brief
Content-Type: application/json
Accept: application/json
```

```json
{
  "keywords": ["kubernetes", "bitcoin", "fed", "cve", "llm", "openai", "cloudflare"],
  "topics": ["tech", "crypto", "markets", "security", "ai", "finance", "world", "infra"],
  "max_items_per_topic": 5,
  "format": "json",
  "synthesize": false
}
```

| Field | Type | Notes |
|-------|------|--------|
| `keywords` | `string[]` | Rank matches first; unmatched slots backfill with freshest items in that topic |
| `topics` | `string[]` | Closed set: `world`, `markets`, `finance`, `crypto`, `security`, `ai`, `infra`, `tech` |
| `max_items_per_topic` | `number` | Default `5`, clamped `1…20` |
| `format` | `"json"` \| `"markdown"` | `json` omits `brief_markdown`; default includes both |
| `synthesize` | `boolean` | Must be `false` / omitted until LLM metering ships |

Legacy aliases accepted during cutover: `sections` → `topics`, `max_items_per_section` → `max_items_per_topic`.

### Response `200` (paid or Testnet `x-dev-bypass`)

```json
{
  "generated_at": "2026-08-08T06:12:00.000Z",
  "request_id": "f82c9f6a-662c-4d56-83bb-6571ebb1a080",
  "meta": {
    "model": "extractive",
    "sources_used": 40,
    "store_age_s": 218,
    "synthesize": false,
    "economics": {
      "price_usdc": 0.05,
      "llm_cost_usd": 0
    }
  },
  "topics": [
    {
      "id": "tech",
      "items": [
        {
          "headline": "Anthropic will design its own hardware to power Claude",
          "summary": "Anthropic and OpenAI are racing to scale up while reducing dependence on Nvidia.",
          "why_it_matters": "Matched source ars (tech).",
          "references": [
            {
              "title": "Anthropic will design its own hardware to power Claude",
              "url": "https://arstechnica.com/ai/2026/08/anthropic-confirms-plans-to-build-an-in-house-silicon-team/",
              "published_at": "2026-08-06T20:03:44.000Z"
            }
          ]
        }
      ]
    },
    {
      "id": "crypto",
      "items": [
        {
          "headline": "Bitcoin tops $65,000 after ‘massive surprise’ US jobs miss",
          "summary": "Bitcoin topped $65,000 after U.S. payrolls fell 23,000 in July versus an 80,000 forecast, pushing traders to price out a September Fed rate hike.",
          "why_it_matters": "Matched source theblock (crypto).",
          "references": [
            {
              "title": "Bitcoin tops $65,000 after ‘massive surprise’ US jobs miss",
              "url": "https://www.theblock.co/news/markets/2026-08-07-bitcoin-tops-65000-after-massive-surprise-us-jobs-miss-411154",
              "published_at": "2026-08-07T14:02:44.000Z"
            }
          ]
        }
      ]
    },
    {
      "id": "markets",
      "items": [
        {
          "headline": "Crypto F&G 30 (Fear)",
          "summary": "{\"value\":\"30\",\"value_classification\":\"Fear\",…} · {\"value\":30,\"classification\":\"Fear\"}",
          "why_it_matters": "Matched source crypto-fng (markets).",
          "references": [
            {
              "title": "Crypto F&G 30 (Fear)",
              "url": "https://alternative.me/crypto/fear-and-greed-index/",
              "published_at": "2026-08-08T00:00:00.000Z"
            }
          ]
        },
        {
          "headline": "GLD | 398.47 USD",
          "summary": "{\"prev_close\":371.54,\"exchange\":\"PCX\"} · {\"symbol\":\"GLD\",\"price\":398.47,\"currency\":\"USD\",\"previous_close\":371.54}",
          "why_it_matters": "Matched source yahoo-gld (markets).",
          "references": [
            {
              "title": "GLD | 398.47 USD",
              "url": "https://finance.yahoo.com/quote/GLD",
              "published_at": "2026-08-07T20:00:00.000Z"
            }
          ]
        }
      ]
    },
    {
      "id": "security",
      "items": [
        {
          "headline": "CISA Adds One Known Exploited Vulnerability to Catalog",
          "summary": "CISA has added one new vulnerability to its Known Exploited Vulnerabilities (KEV) Catalog…",
          "why_it_matters": "Matched source cisa-alerts (security).",
          "references": [
            {
              "title": "CISA Adds One Known Exploited Vulnerability to Catalog",
              "url": "https://www.cisa.gov/news-events/alerts/2026/08/07/cisa-adds-one-known-exploited-vulnerability-catalog",
              "published_at": "2026-08-07T12:00:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

With `format` omitted or `"markdown"`, the body also includes `brief_markdown` (same items rendered as `# Morning brief` sections).

Example from Testnet (2026-08-07): eight topics × five items ≈ **40** citations, `sources_used: 40`, live Wave1 corpus (Ars, CoinDesk, CISA, Cloudflare, …). Settle tx sample: `HMSQEB6ZFKFUZKGIPTF7IYAP6VXKPK5FG5A76LNHU527YFCEP3FA`.

### Errors

| Status | When |
|--------|------|
| `402` | No valid payment (body often `{}`; see `PAYMENT-REQUIRED` header) |
| `400` | Invalid body / unknown topics / `synthesize: true` |
| `409` | Payment header replay (`payment_already_used`) |

### Local unpaid smoke (Testnet only)

```bash
curl -s -X POST "$BASE/v1/brief" \
  -H 'content-type: application/json' \
  -H "x-dev-bypass: $DEV_BYPASS_SECRET" \
  -d '{"keywords":["bitcoin","fed"],"topics":["crypto","markets","tech"],"max_items_per_topic":3}'
```

Never set `DEV_BYPASS_SECRET` on Mainnet prod.

---

## What payers get today

**Good fit:** agent-oriented citation pack — structured topics, URLs, `published_at`, freshness via `store_age_s`, fixed low price, no LLM cost on the default path.

**Not yet polished:** `why_it_matters` is still a source-match stub; some RSS/HN summaries are noisy; markets rows can expose raw quote payloads in `summary` (improve before marketing as a human-readable brief).

---

## Related endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | none |
| `GET` | `/.well-known/x402.json` | none |
| `POST` | `/internal/ingest` | `Authorization: Bearer $INGEST_TOKEN` (hydrate JSON only) |

Live feed fetch / cron: separate Worker `x402-agent-ingest` → `POST /internal/run-ingest` (same bearer). See [../AGENTS.md](../AGENTS.md).
