import type { FeedItem, SectionId } from "@x402-agent-api/shared";
import { SECTION_FRESHNESS_S } from "@x402-agent-api/shared";

type ItemRow = {
  id: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  section: string;
  published_at: number;
  ingested_at: number;
  keywords_hint: string;
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
    section: row.section as SectionId,
    published_at: row.published_at,
    ingested_at: row.ingested_at,
    keywords_hint,
  };
}

/** Newest-first candidates for one section within its freshness floor. */
export async function querySectionCandidates(
  db: D1Database,
  section: SectionId,
  nowSec = Math.floor(Date.now() / 1000),
  limit = 200,
): Promise<FeedItem[]> {
  const cutoff = nowSec - SECTION_FRESHNESS_S[section];
  const { results } = await db
    .prepare(
      `SELECT id, url, title, summary, source, section, published_at, ingested_at, keywords_hint
       FROM items
       WHERE section = ? AND published_at >= ?
       ORDER BY published_at DESC
       LIMIT ?`,
    )
    .bind(section, cutoff, limit)
    .all<ItemRow>();
  return (results ?? []).map(rowToItem);
}

export async function upsertItems(db: D1Database, items: FeedItem[]): Promise<number> {
  if (items.length === 0) return 0;
  let written = 0;
  for (const item of items) {
    const result = await db
      .prepare(
        `INSERT INTO items (id, url, title, summary, source, section, published_at, ingested_at, keywords_hint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           source = excluded.source,
           section = excluded.section,
           published_at = excluded.published_at,
           ingested_at = excluded.ingested_at,
           keywords_hint = excluded.keywords_hint`,
      )
      .bind(
        item.id,
        item.url,
        item.title,
        item.summary,
        item.source,
        item.section,
        item.published_at,
        item.ingested_at,
        JSON.stringify(item.keywords_hint),
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
