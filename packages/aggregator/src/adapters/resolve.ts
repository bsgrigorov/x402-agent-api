/**
 * Resolve feed id → extraction adapter.
 *
 * New ordinary RSS/Atom source: add to sources.*.json only (falls through to rss).
 * New special source: add adapter module + register here (or set SourceDef.adapter later).
 */
import type { SourceDef } from "../types.js";
import type { SourceAdapter } from "./types.js";
import { rssAdapter } from "./rss.js";
import { cisaAdapter } from "./cisa.js";
import { tldrAdapter } from "./tldr.js";
import { githubAdvisoriesAdapter } from "./github-advisories.js";
import { coingeckoMarketsAdapter } from "./coingecko-markets.js";
import { coingeckoGlobalAdapter } from "./coingecko-global.js";
import { cryptoFngAdapter } from "./crypto-fng.js";
import { yahooQuoteAdapter } from "./yahoo-quote.js";

const BY_ID: Record<string, SourceAdapter> = {
  "cisa-alerts": cisaAdapter,
  "tldr-fintech": tldrAdapter,
  "tldr-crypto": tldrAdapter,
  "tldr-infosec": tldrAdapter,
  "tldr-tech": tldrAdapter,
  "tldr-devops": tldrAdapter,
  "tldr-ai": tldrAdapter,
  "gh-advisories": githubAdvisoriesAdapter,
  "coingecko-markets": coingeckoMarketsAdapter,
  "coingecko-global": coingeckoGlobalAdapter,
  "crypto-fng": cryptoFngAdapter,
  "yahoo-voo": yahooQuoteAdapter,
  "yahoo-qqq": yahooQuoteAdapter,
  "yahoo-vix": yahooQuoteAdapter,
  "yahoo-tnx": yahooQuoteAdapter,
  "yahoo-gld": yahooQuoteAdapter,
  "yahoo-uso": yahooQuoteAdapter,
};

export function resolveAdapter(source: SourceDef): SourceAdapter {
  const byId = BY_ID[source.id];
  if (byId) return byId;
  // Registry hint for future TLDR feeds without editing BY_ID
  if (source.expand === "tldr-html") return tldrAdapter;
  if (source.kind === "json-api") {
    throw new Error(`no adapter registered for json-api source: ${source.id}`);
  }
  return rssAdapter;
}

export function registeredAdapterIds(): string[] {
  return Object.keys(BY_ID).sort();
}
