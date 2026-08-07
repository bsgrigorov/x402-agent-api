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

export function filterAndRank(
  candidates: FeedItem[],
  keywords: string[],
  maxItems: number,
): FeedItem[] {
  const scored = candidates
    .map((item) => ({ item, score: scoreItem(item, keywords) }))
    .filter((x) => (keywords.length === 0 ? true : x.score > 0));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.published_at - a.item.published_at;
  });

  return scored.slice(0, maxItems).map((x) => x.item);
}
