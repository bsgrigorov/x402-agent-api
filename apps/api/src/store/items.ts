import type { FeedItem, TopicId } from "@x402-agent-api/shared";
import { TOPIC_FRESHNESS_S } from "@x402-agent-api/shared";

type ItemRow = {
  id: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  topic: string;
  kind: string;
  published_at: number;
  ingested_at: number;
  external_id: string;
  keywords_hint: string;
  payload: string;
};

function rowToItem(row: ItemRow): FeedItem {
  let keywords_hint: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.keywords_hint);
    if (Array.isArray(parsed)) {
      keywords_hint = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    keywords_hint = [];
  }
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    source: row.source,
    topic: row.topic as TopicId,
    kind: row.kind === "quote" ? "quote" : "article",
    published_at: row.published_at,
    ingested_at: row.ingested_at,
    external_id: row.external_id ?? "",
    keywords_hint,
    payload: row.payload ?? "{}",
  };
}

/** Newest-first candidates for one topic within its freshness floor. */
export async function queryTopicCandidates(
  db: D1Database,
  topic: TopicId,
  nowSec = Math.floor(Date.now() / 1000),
  limit = 200,
): Promise<FeedItem[]> {
  const cutoff = nowSec - TOPIC_FRESHNESS_S[topic];
  const { results } = await db
    .prepare(
      `SELECT id, url, title, summary, source, topic, kind, published_at, ingested_at,
              external_id, keywords_hint, payload
       FROM items
       WHERE topic = ? AND published_at >= ? AND kind = 'article'
       ORDER BY published_at DESC
       LIMIT ?`,
    )
    .bind(topic, cutoff, limit)
    .all<ItemRow>();
  return (results ?? []).map(rowToItem);
}

/** Latest market quotes (no freshness floor beyond retention). */
export async function queryQuotes(
  db: D1Database,
  limit = 50,
): Promise<FeedItem[]> {
  const { results } = await db
    .prepare(
      `SELECT id, url, title, summary, source, topic, kind, published_at, ingested_at,
              external_id, keywords_hint, payload
       FROM items
       WHERE kind = 'quote'
       ORDER BY source ASC
       LIMIT ?`,
    )
    .bind(limit)
    .all<ItemRow>();
  return (results ?? []).map(rowToItem);
}

export async function upsertItems(db: D1Database, items: FeedItem[]): Promise<number> {
  if (items.length === 0) return 0;
  let written = 0;
  for (const item of items) {
    const result = await db
      .prepare(
        `INSERT INTO items (
           id, url, title, summary, source, topic, kind,
           published_at, ingested_at, external_id, keywords_hint, payload
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           source = excluded.source,
           topic = excluded.topic,
           kind = excluded.kind,
           published_at = excluded.published_at,
           ingested_at = excluded.ingested_at,
           external_id = excluded.external_id,
           keywords_hint = excluded.keywords_hint,
           payload = excluded.payload`,
      )
      .bind(
        item.id,
        item.url,
        item.title,
        item.summary,
        item.source,
        item.topic,
        item.kind,
        item.published_at,
        item.ingested_at,
        item.external_id,
        JSON.stringify(item.keywords_hint),
        item.payload,
      )
      .run();
    if (result.success) written += 1;
  }
  return written;
}

export async function newestIngestedAt(db: D1Database): Promise<number | null> {
  const row = await db
    .prepare(`SELECT MAX(ingested_at) AS max_ingested FROM items`)
    .first<{ max_ingested: number | null }>();
  return row?.max_ingested ?? null;
}
