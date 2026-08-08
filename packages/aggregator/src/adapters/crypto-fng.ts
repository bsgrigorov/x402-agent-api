import { parseTimeToUnix, type RawCandidate } from "../candidate.js";
import type { SourceAdapter } from "./types.js";

export const cryptoFngAdapter: SourceAdapter = {
  name: "crypto-fng",
  async extract({ body, nowUnix }) {
    const data: unknown = JSON.parse(body);
    if (!data || typeof data !== "object") return { candidates: [] };
    const rows = ((data as { data?: unknown[] }).data ?? []) as Record<string, unknown>[];
    const candidates: RawCandidate[] = rows.map((row) => ({
      title: `Crypto F&G ${row.value} (${row.value_classification})`,
      url: "https://alternative.me/crypto/fear-and-greed-index/",
      summary: JSON.stringify(row),
      published_at: parseTimeToUnix(Number(row.timestamp), nowUnix),
      external_id: "crypto-fng",
      kind: "quote" as const,
      payload: {
        value: Number(row.value),
        classification: String(row.value_classification ?? ""),
      },
    }));
    return { candidates };
  },
};
