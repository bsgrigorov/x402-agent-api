import type { BriefRequest, BriefResponse, TopicId } from "@x402-agent-api/shared";
import { assembleExtractive } from "./assemble";
import { filterAndRank } from "./filter";
import { newestIngestedAt, queryQuotes, queryTopicCandidates } from "../store/items";

/**
 * Morning-brief product entrypoint — no HTTP, no x402.
 * Default path is extractive; synthesize stays gated off until metering + budget exist.
 */
export async function buildBrief(
  db: D1Database,
  req: BriefRequest,
  priceUsdc: number,
): Promise<BriefResponse> {
  if (req.synthesize) {
    throw new Error("synthesize is disabled until metering + LLM budget are live");
  }

  const max = Math.min(Math.max(req.max_items_per_topic ?? 5, 1), 20);
  const byTopic = new Map<TopicId, ReturnType<typeof filterAndRank>>();

  for (const topic of req.topics) {
    if (topic === "markets") {
      // Markets brief block uses quote rows (prices), not articles.
      const quotes = await queryQuotes(db, max);
      byTopic.set(topic, quotes.slice(0, max));
      continue;
    }
    const candidates = await queryTopicCandidates(db, topic);
    byTopic.set(topic, filterAndRank(candidates, req.keywords, max));
  }

  const newest = await newestIngestedAt(db);
  const storeAgeS =
    newest == null ? null : Math.max(0, Math.floor(Date.now() / 1000) - newest);

  return assembleExtractive({ byTopic, priceUsdc, storeAgeS });
}
