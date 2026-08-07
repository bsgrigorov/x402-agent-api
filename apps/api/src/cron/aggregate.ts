import { FEED_ALLOWLIST } from "@x402-agent-api/feeds";
import type { FeedItem } from "@x402-agent-api/shared";
import { sanitizeFeedText, sha256Hex } from "@x402-agent-api/shared";
import type { Env } from "../env";
import { upsertItems } from "../store/items";

/**
 * Minimal RSS item scrape. Good enough for MVP hydrate/cron; swap for a real
 * parser later without touching route/x402 code.
 */
function parseRssItems(
  xml: string,
  source: string,
  section: FeedItem["section"],
  now: number,
): Omit<FeedItem, "id">[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const out: Omit<FeedItem, "id">[] = [];
  for (const chunk of chunks.slice(0, 40)) {
    const title = chunk.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1];
    const link =
      chunk.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i)?.[1] ??
      chunk.match(/<guid[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/guid>/i)?.[1];
    const desc = chunk.match(
      /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i,
    )?.[1];
    const pub = chunk.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1];
    if (!title || !link) continue;
    const published = pub ? Math.floor(Date.parse(pub) / 1000) : now;
    out.push({
      url: link.trim(),
      title: sanitizeFeedText(title.replace(/<[^>]+>/g, ""), 300),
      summary: sanitizeFeedText((desc ?? "").replace(/<[^>]+>/g, ""), 800),
      source,
      section,
      published_at: Number.isFinite(published) ? published : now,
      ingested_at: now,
      keywords_hint: [],
    });
  }
  return out;
}

export async function aggregateFeeds(env: Env): Promise<{ feeds: number; written: number }> {
  const now = Math.floor(Date.now() / 1000);
  const collected: FeedItem[] = [];
  let feedsOk = 0;

  for (const feed of FEED_ALLOWLIST) {
    try {
      const res = await fetch(feed.url, {
        headers: { "user-agent": "x402-agent-api/0.1 (+https://x402.darkhold.dev)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const parsed = parseRssItems(xml, feed.label, feed.section, now);
      for (const item of parsed) {
        collected.push({ ...item, id: await sha256Hex(item.url) });
      }
      feedsOk += 1;
    } catch {
      // per-source isolation
    }
  }

  const written = await upsertItems(env.DB, collected);
  return { feeds: feedsOk, written };
}
