import { parseTimeToUnix, type RawCandidate } from "../candidate.js";
import type { SourceAdapter } from "./types.js";

/** Yahoo Finance chart JSON → one quote candidate. Shared by yahoo-voo, yahoo-qqq, … */
export const yahooQuoteAdapter: SourceAdapter = {
  name: "yahoo-quote",
  async extract({ source, body, nowUnix }) {
    const data: unknown = JSON.parse(body);
    if (!data || typeof data !== "object") return { candidates: [] };
    const result = (
      ((data as { chart?: { result?: unknown[] } }).chart?.result ?? [])[0] ?? {}
    ) as { meta?: Record<string, unknown> };
    const meta = result.meta ?? {};
    const symbol = String(meta.symbol ?? source.id.replace(/^yahoo-/, "").toUpperCase());
    const candidates: RawCandidate[] = [
      {
        title: `${symbol} | ${meta.regularMarketPrice} ${meta.currency}`,
        url: `https://finance.yahoo.com/quote/${symbol}`,
        summary: JSON.stringify({
          prev_close: meta.chartPreviousClose ?? meta.previousClose,
          exchange: meta.exchangeName,
        }),
        published_at: parseTimeToUnix(Number(meta.regularMarketTime), nowUnix),
        external_id: symbol,
        kind: "quote",
        payload: {
          symbol,
          price: meta.regularMarketPrice,
          currency: meta.currency,
          previous_close: meta.chartPreviousClose ?? meta.previousClose,
        },
      },
    ];
    return { candidates };
  },
};
