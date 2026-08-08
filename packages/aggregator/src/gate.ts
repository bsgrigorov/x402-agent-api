/**
 * Aggregate gate: RawCandidate → FeedItem/NormalizedItem.
 * Source-agnostic: freshness, caps, URL policy, text caps.
 */
import { sha256Hex } from "@x402-agent-api/shared";
import type { RawCandidate } from "./candidate.js";
import {
  DEFAULT_PER_FEED_CAP,
  SUMMARY_MAX,
  TITLE_MAX,
  TOPIC_FRESHNESS_S,
  type ItemKind,
  type NormalizedItem,
  type TopicId,
} from "./types.js";
import { sanitizeText } from "./text.js";

export function isBlockedCitationUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "news.google.com" || host.endsWith(".news.google.com");
  } catch {
    return true;
  }
}

export type GateDrop =
  | "missing_title_or_url"
  | "bad_url"
  | "gnews_redirect"
  | "stale"
  | "over_cap";

export type GateResult = {
  items: NormalizedItem[];
  drops: Record<GateDrop, number>;
};

export async function gateCandidates(
  candidates: RawCandidate[],
  opts: {
    source: string;
    topic: TopicId;
    ingestedAt: number;
    perFeedCap?: number;
    maxAgeS?: number;
  },
): Promise<GateResult> {
  const drops: Record<GateDrop, number> = {
    missing_title_or_url: 0,
    bad_url: 0,
    gnews_redirect: 0,
    stale: 0,
    over_cap: 0,
  };
  const maxAge = opts.maxAgeS ?? TOPIC_FRESHNESS_S[opts.topic];
  const cutoff = opts.ingestedAt - maxAge;
  const cap = opts.perFeedCap ?? DEFAULT_PER_FEED_CAP;
  const out: NormalizedItem[] = [];

  for (const c of candidates) {
    if (out.length >= cap) {
      drops.over_cap += 1;
      continue;
    }
    const title = sanitizeText(c.title ?? "", TITLE_MAX);
    const url = (c.url ?? "").trim();
    if (!title || !url) {
      drops.missing_title_or_url += 1;
      continue;
    }
    let absolute: string;
    try {
      absolute = new URL(url).toString();
    } catch {
      drops.bad_url += 1;
      continue;
    }
    if (isBlockedCitationUrl(absolute)) {
      drops.gnews_redirect += 1;
      continue;
    }
    const published = c.published_at && c.published_at > 0 ? c.published_at : opts.ingestedAt;
    if (published < cutoff) {
      drops.stale += 1;
      continue;
    }
    const kind: ItemKind = c.kind ?? "article";
    const hints = (c.keywords_hint ?? [])
      .map((h) => sanitizeText(h, 64))
      .filter(Boolean)
      .slice(0, 12);
    out.push({
      id: await sha256Hex(absolute),
      url: absolute,
      title,
      summary: sanitizeText(c.summary ?? "", SUMMARY_MAX),
      source: opts.source,
      topic: opts.topic,
      kind,
      published_at: published,
      ingested_at: opts.ingestedAt,
      external_id: sanitizeText(c.external_id ?? "", 200),
      keywords_hint: hints,
      payload: JSON.stringify(c.payload ?? {}),
    });
  }

  return { items: out, drops };
}
