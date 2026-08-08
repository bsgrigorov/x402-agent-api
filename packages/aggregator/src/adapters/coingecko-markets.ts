import { parseTimeToUnix, type RawCandidate } from "../candidate.js";
import type { SourceAdapter } from "./types.js";

export const coingeckoMarketsAdapter: SourceAdapter = {
  name: "coingecko-markets",
  async extract({ body, nowUnix }) {
    const data: unknown = JSON.parse(body);
    if (!Array.isArray(data)) return { candidates: [] };
    const candidates: RawCandidate[] = data.map((row) => {
      const coin = row as Record<string, unknown>;
      const id = String(coin.id ?? "");
      const symbol = String(coin.symbol ?? "").toUpperCase();
      return {
        title: `${symbol} | ${coin.current_price} USD`,
        url: `https://www.coingecko.com/en/coins/${id}`,
        summary: `24h ${coin.price_change_percentage_24h}% · 7d ${coin.price_change_percentage_7d_in_currency}% · mcap ${coin.market_cap}`,
        published_at: parseTimeToUnix(String(coin.last_updated ?? ""), nowUnix),
        external_id: id,
        kind: "quote" as const,
        payload: {
          symbol,
          price: coin.current_price,
          change_24h: coin.price_change_percentage_24h,
          change_7d: coin.price_change_percentage_7d_in_currency,
          market_cap: coin.market_cap,
        },
      };
    });
    return { candidates };
  },
};
