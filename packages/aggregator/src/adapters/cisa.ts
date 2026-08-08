import { sanitizeText } from "../text.js";
import { parseFeedXml } from "../lib/rss.js";
import type { SourceAdapter } from "./types.js";

/** CISA advisories embed a "View CSAF" link before the real abstract. */
function stripCisaSummaryPrefix(summary: string): string {
  return summary.replace(/^View CSAF Summary\s+/i, "");
}

export const cisaAdapter: SourceAdapter = {
  name: "cisa",
  async extract({ body, nowUnix }) {
    const candidates = parseFeedXml(body, nowUnix).map((c) => ({
      ...c,
      summary: stripCisaSummaryPrefix(sanitizeText(c.summary ?? "", 2000)),
    }));
    return { candidates };
  },
};
