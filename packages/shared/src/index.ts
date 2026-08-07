export type SectionId =
  | "tech"
  | "security"
  | "ai"
  | "finance"
  | "crypto"
  | "world"
  | "sports";

export const SECTIONS: readonly SectionId[] = [
  "tech",
  "security",
  "ai",
  "finance",
  "crypto",
  "world",
  "sports",
] as const;

/** Soft freshness floors (seconds) for candidate queries — stricter than retention. */
export const SECTION_FRESHNESS_S: Record<SectionId, number> = {
  tech: 72 * 3600,
  security: 7 * 24 * 3600,
  ai: 72 * 3600,
  finance: 48 * 3600,
  crypto: 48 * 3600,
  world: 48 * 3600,
  sports: 48 * 3600,
};

/** Hard delete items older than this (seconds). */
export const ITEM_RETENTION_S = 56 * 24 * 3600; // 8 weeks

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  source: string;
  section: SectionId;
  published_at: number;
  ingested_at: number;
  keywords_hint: string[];
};

export type BriefRequest = {
  keywords: string[];
  sections: SectionId[];
  format?: "markdown" | "json";
  max_items_per_section?: number;
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
  sections: Array<{ id: SectionId; items: BriefItem[] }>;
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

export function isSectionId(value: string): value is SectionId {
  return (SECTIONS as readonly string[]).includes(value);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
