import type { FeedItem } from "@x402-agent-api/shared";

function normalize(s: string): string {
  return s.toLowerCase();
}

/** Score how well an item matches any keyword (title/summary/hints). */
export function scoreItem(item: FeedItem, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const hay = normalize(
    `${item.title} ${item.summary} ${item.keywords_hint.join(" ")}`,
  );
  let score = 0;
  for (const raw of keywords) {
    const kw = normalize(raw.trim());
    if (!kw) continue;
    if (hay.includes(kw)) score += 1;
  }
  return score;
}

/**
 * Prefer keyword hits, then backfill with newest remaining candidates so
 * each topic still returns a useful brief when keywords are narrow.
 */
export function filterAndRank(
  candidates: FeedItem[],
  keywords: string[],
  maxItems: number,
): FeedItem[] {
  if (maxItems <= 0) return [];

  const scored = candidates.map((item) => ({
    item,
    score: scoreItem(item, keywords),
  }));

  const hits = scored
    .filter((x) => (keywords.length === 0 ? true : x.score > 0))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.item.published_at - a.item.published_at;
    });

  const out: FeedItem[] = [];
  const used = new Set<string>();
  for (const { item } of hits) {
    if (out.length >= maxItems) break;
    out.push(item);
    used.add(item.id);
  }

  if (out.length < maxItems) {
    const rest = [...candidates]
      .filter((item) => !used.has(item.id))
      .sort((a, b) => b.published_at - a.published_at);
    for (const item of rest) {
      if (out.length >= maxItems) break;
      out.push(item);
      used.add(item.id);
    }
  }

  return out;
}
