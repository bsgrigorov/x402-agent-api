import { parseFeedXml } from "../lib/rss.js";
import type { SourceAdapter } from "./types.js";

/** Default adapter for ordinary RSS/Atom article feeds. */
export const rssAdapter: SourceAdapter = {
  name: "rss",
  async extract({ body, nowUnix }) {
    return { candidates: parseFeedXml(body, nowUnix) };
  },
};
