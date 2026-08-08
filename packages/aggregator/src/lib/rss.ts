/** Low-level RSS 2.0 / Atom parse → RawCandidate. No source-specific policy. */

import { XMLParser } from "fast-xml-parser";
import { parseTimeToUnix, type RawCandidate } from "../candidate.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  isArray: (name) => ["item", "entry", "category", "link"].includes(name),
});

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const v of value) {
      const t = asText(v);
      if (t) return t;
    }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("@_href" in obj && obj["@_href"]) return String(obj["@_href"]);
    if ("#cdata" in obj) return asText(obj["#cdata"]);
    if ("#text" in obj) return asText(obj["#text"]);
  }
  return "";
}

function atomLink(entry: Record<string, unknown>): string {
  const links = entry.link;
  if (!links) return "";
  const list = Array.isArray(links) ? links : [links];
  for (const link of list) {
    if (typeof link === "string") return link;
    if (link && typeof link === "object") {
      const l = link as Record<string, unknown>;
      const rel = l["@_rel"] == null ? "alternate" : String(l["@_rel"]);
      const href = String(l["@_href"] ?? "");
      if (href && rel === "alternate") return href;
    }
  }
  for (const link of list) {
    if (link && typeof link === "object") {
      const href = String((link as Record<string, unknown>)["@_href"] ?? "");
      if (href) return href;
    }
  }
  return "";
}

function categoriesOf(node: Record<string, unknown>): string[] {
  const raw = node.category;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const o = c as Record<string, unknown>;
        return asText(o["@_term"] ?? o["#text"] ?? o);
      }
      return "";
    })
    .filter(Boolean);
}

function mapRssItem(item: Record<string, unknown>, nowUnix: number): RawCandidate {
  const guid = asText(item.guid);
  const link = asText(item.link) || (guid.startsWith("http") ? guid : "");
  const description = asText(item.description);
  const publisher = asText(item.source);
  const summary =
    description ||
    (publisher ? `Via ${publisher}` : "") ||
    asText((item as { "content:encoded"?: unknown })["content:encoded"]);
  return {
    title: asText(item.title),
    url: link,
    summary,
    published_at: parseTimeToUnix(asText(item.pubDate), nowUnix),
    external_id: guid,
    keywords_hint: categoriesOf(item),
    payload: publisher ? { publisher } : undefined,
  };
}

/** Parse RSS 2.0 or Atom into candidates (no freshness / topic). */
export function parseFeedXml(xml: string, nowUnix: number): RawCandidate[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  if (doc.rss || (doc.feed === undefined && (doc as { RDF?: unknown }).RDF)) {
    const rss = (doc.rss ?? doc) as Record<string, unknown>;
    const channel = (rss.channel ?? rss) as Record<string, unknown>;
    const items = (channel.item ?? []) as Record<string, unknown>[];
    return items.map((item) => mapRssItem(item, nowUnix));
  }

  if (doc.feed) {
    const feed = doc.feed as Record<string, unknown>;
    const entries = (feed.entry ?? []) as Record<string, unknown>[];
    return entries.map((entry) => {
      const id = asText(entry.id);
      return {
        title: asText(entry.title),
        url: atomLink(entry) || (id.startsWith("http") ? id : ""),
        summary: asText(entry.summary) || asText(entry.content),
        published_at: parseTimeToUnix(asText(entry.published) || asText(entry.updated), nowUnix),
        external_id: id,
        keywords_hint: categoriesOf(entry),
      };
    });
  }

  if (doc.channel) {
    return parseFeedXml(`<rss>${xml}</rss>`, nowUnix);
  }

  return [];
}
