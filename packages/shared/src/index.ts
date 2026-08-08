export type TopicId =
  | "world"
  | "markets"
  | "finance"
  | "crypto"
  | "security"
  | "ai"
  | "infra"
  | "tech";

export const TOPICS: readonly TopicId[] = [
  "world",
  "markets",
  "finance",
  "crypto",
  "security",
  "ai",
  "infra",
  "tech",
] as const;

/** Soft freshness floors (seconds) for candidate queries — stricter than retention. */
export const TOPIC_FRESHNESS_S: Record<TopicId, number> = {
  world: 48 * 3600,
  markets: 48 * 3600,
  finance: 48 * 3600,
  crypto: 48 * 3600,
  security: 7 * 24 * 3600,
  ai: 72 * 3600,
  infra: 72 * 3600,
  tech: 72 * 3600,
};

/** Hard delete items older than this (seconds). */
export const ITEM_RETENTION_S = 56 * 24 * 3600; // 8 weeks

export type ItemKind = "article" | "quote";

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  topic: TopicId;
  kind: ItemKind;
  published_at: number;
  ingested_at: number;
  external_id: string;
  keywords_hint: string[];
  /** JSON object string; "{}" for articles */
  payload: string;
};

export type BriefRequest = {
  keywords: string[];
  topics: TopicId[];
  format?: "markdown" | "json";
  max_items_per_topic?: number;
  synthesize?: boolean;
};

export type BriefItem = {
  headline: string;
  summary: string;
  why_it_matters: string;
  references: Array<{ title: string; url: string; published_at: string }>;
};

export type BriefResponse = {
  generated_at: string;
  brief_markdown: string;
  topics: Array<{ id: TopicId; items: BriefItem[] }>;
  meta: {
    model: string;
    sources_used: number;
    store_age_s: number | null;
    synthesize: boolean;
    economics?: { price_usdc: number; llm_cost_usd: number };
  };
};

/** Treat feed/title text as untrusted: strip control chars, cap length. */
export function sanitizeFeedText(input: string, max = 500): string {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function isTopicId(value: string): value is TopicId {
  return (TOPICS as readonly string[]).includes(value);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
