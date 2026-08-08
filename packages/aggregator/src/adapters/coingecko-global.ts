import type { RawCandidate } from "../candidate.js";
import type { SourceAdapter } from "./types.js";

export const coingeckoGlobalAdapter: SourceAdapter = {
  name: "coingecko-global",
  async extract({ body, nowUnix }) {
    const data: unknown = JSON.parse(body);
    if (!data || typeof data !== "object") return { candidates: [] };
    const g = ((data as { data?: Record<string, unknown> }).data ?? data) as Record<
      string,
      unknown
    >;
    const mcap = g.total_market_cap as Record<string, unknown> | undefined;
    const dom = g.market_cap_percentage as Record<string, unknown> | undefined;
    const candidates: RawCandidate[] = [
      {
        title: "Crypto global market",
        url: "https://www.coingecko.com/en/global-charts",
        summary: `mcap_usd=${mcap?.usd} btc_dom=${dom?.btc} eth_dom=${dom?.eth}`,
        published_at: nowUnix,
        external_id: "coingecko-global",
        kind: "quote",
        payload: {
          total_market_cap_usd: mcap?.usd,
          btc_dominance: dom?.btc,
          eth_dominance: dom?.eth,
        },
      },
    ];
    return { candidates };
  },
};
