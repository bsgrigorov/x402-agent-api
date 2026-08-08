/** TLDR: RSS editions + optional HTML expand into story candidates. */

import type { RawCandidate } from "../candidate.js";
import { parseFeedXml } from "../lib/rss.js";
import { sanitizeText } from "../text.js";
import type { ExtractContext, SourceAdapter } from "./types.js";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 x402-tldr-expand/0.1";

const DEFAULT_EDITIONS = 2;

const SKIP_HOST_SUBSTR = [
  "tldr.tech",
  "advertise.tldr",
  "googletagmanager",
  "sparkloop",
  "turnstile",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "facebook.com",
  "tines.com",
  "threadreaderapp.com",
] as const;

const BAD_ANCHOR = /^(read more|learn more|here|link|click here|source)$/i;

export type StoryLink = { url: string; title: string };

export function cleanTldrUrl(raw: string): string | null {
  const url = raw.replace(/&amp;/g, "&");
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  for (const key of [...u.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower === "unlocked_article_code" ||
      lower.startsWith("utm_")
    ) {
      u.searchParams.delete(key);
    }
  }
  return u.toString();
}

export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    let seg = parts[parts.length - 1] ?? u.hostname;
    if (/^\d+$/.test(seg) && parts.length >= 2) {
      seg = parts[parts.length - 2]!;
    }
    const cleaned = seg
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned || /^\d+$/.test(cleaned)) return u.hostname;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return url.slice(0, 120);
  }
}

function isUsefulAnchor(text: string): boolean {
  if (text.length < 18) return false;
  if (BAD_ANCHOR.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^\d+$/.test(text)) return false;
  return true;
}

export function extractTldrStoryLinks(html: string): StoryLink[] {
  const out: StoryLink[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const href = m[1]!.replace(/&amp;/g, "&");
    let host: string;
    try {
      host = new URL(href).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (SKIP_HOST_SUBSTR.some((s) => host.includes(s))) continue;
    if (!href.includes("utm_source=tldr")) continue;
    const cleaned = cleanTldrUrl(href);
    if (!cleaned || seen.has(cleaned)) continue;

    const anchor = sanitizeText(m[2] ?? "", 300);
    const fromUrl = titleFromUrl(cleaned);
    const title = isUsefulAnchor(anchor) ? anchor : fromUrl;
    if (/^\d+(\.\d+)*$/.test(title.replace(/\s/g, "")) || title.length < 8) continue;
    try {
      if (title.toLowerCase() === new URL(cleaned).hostname.toLowerCase()) continue;
    } catch {
      /* ignore */
    }

    seen.add(cleaned);
    out.push({ url: cleaned, title });
  }
  return out;
}

export function bulletsFromEditionTitle(title: string): string[] {
  return title
    .split(/,\s*/)
    .map((b) => b.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim())
    .filter((b) => b.length >= 3)
    .slice(0, 12);
}

export async function fetchEditionHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": DEFAULT_UA, accept: "text/html" },
  });
  if (!res.ok) throw new Error(`TLDR edition HTTP ${res.status}`);
  return res.text();
}

export function editionToStoryCandidates(
  edition: RawCandidate,
  html: string,
  sourceId: string,
): RawCandidate[] {
  const links = extractTldrStoryLinks(html);
  const hints = bulletsFromEditionTitle(edition.title);
  const editionUrl = edition.url;
  return links.map(({ url, title }) => ({
    url,
    title,
    summary: `Via ${sourceId} · ${editionUrl}`,
    published_at: edition.published_at,
    external_id: url,
    keywords_hint: hints,
    kind: "article" as const,
    payload: {
      via: "tldr-html",
      edition_url: editionUrl,
      parent_source: sourceId,
    },
  }));
}

function bulletsFromTitleFallback(title: string): string {
  return title
    .split(/,\s*/)
    .map((b) => b.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim())
    .filter(Boolean)
    .join(", ");
}

async function expandEditions(
  sourceId: string,
  editions: RawCandidate[],
  sampleDir: string | undefined,
  editionCount: number,
  sleepMs: number,
): Promise<{ stories: RawCandidate[]; expanded: number; errors: string[] }> {
  const errors: string[] = [];
  const stories: RawCandidate[] = [];
  let expanded = 0;
  const newest = [...editions]
    .filter((e) => e.url)
    .sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0))
    .slice(0, editionCount);

  for (const edition of newest) {
    try {
      const html = await fetchEditionHtml(edition.url);
      stories.push(...editionToStoryCandidates(edition, html, sourceId));
      expanded += 1;
      if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
    } catch (e) {
      errors.push(`${edition.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { stories, expanded, errors };
}

export const tldrAdapter: SourceAdapter = {
  name: "tldr",
  async extract(ctx: ExtractContext) {
    const { source, body, nowUnix, options } = ctx;
    const editions = parseFeedXml(body, nowUnix);
    const doExpand = options?.tldrExpand !== false;
    if (!doExpand) {
      return { candidates: editions, note: "tldr_expand=off" };
    }

    const editionCount = Math.max(1, options?.tldrEditions ?? DEFAULT_EDITIONS);
    const keepEditionIndex = options?.keepEditionIndex === true;
    const { stories, expanded, errors } = await expandEditions(
      source.id,
      editions,
      options?.sampleDir,
      editionCount,
      options?.sleepMs ?? 0,
    );

    const editionKeep =
      keepEditionIndex || stories.length === 0
        ? editions
            .filter((e) => e.url)
            .sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0))
            .slice(0, 1)
            .map((e) => ({
              ...e,
              summary: e.summary || bulletsFromTitleFallback(e.title),
              keywords_hint: [
                ...(e.keywords_hint ?? []),
                ...bulletsFromTitleFallback(e.title).split(", "),
              ].filter(Boolean),
              payload: { ...(e.payload ?? {}), role: "edition-index" },
            }))
        : [];

    let note = `tldr_expand editions=${expanded} stories=${stories.length} edition_index=${editionKeep.length}`;
    if (errors.length) note += ` errors=${errors.length}`;
    return { candidates: [...editionKeep, ...stories], note };
  },
};
