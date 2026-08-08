/** Adapter barrel — monorepo-friendly entry for source extractors. */

export type { SourceAdapter, ExtractContext, ExtractResult, ExtractOptions } from "./types.js";
export { resolveAdapter, registeredAdapterIds } from "./resolve.js";
export { rssAdapter } from "./rss.js";
export { cisaAdapter } from "./cisa.js";
export { tldrAdapter } from "./tldr.js";
export { githubAdvisoriesAdapter } from "./github-advisories.js";
export { coingeckoMarketsAdapter } from "./coingecko-markets.js";
export { coingeckoGlobalAdapter } from "./coingecko-global.js";
export { cryptoFngAdapter } from "./crypto-fng.js";
export { yahooQuoteAdapter } from "./yahoo-quote.js";
