import { Hono } from "hono";
import type { FeedItem, ItemKind, TopicId } from "@x402-agent-api/shared";
import { isTopicId, sanitizeFeedText, sha256Hex } from "@x402-agent-api/shared";
import { upsertItems } from "@x402-agent-api/db";
import type { Env } from "../env";
import { bearerOk } from "./internal_auth";

export const internalRoutes = new Hono<{ Bindings: Env }>();

type IngestBody = {
  items?: Array<{
    url: string;
    title: string;
    summary?: string;
    source: string;
    topic?: string;
    /** @deprecated use topic */
    section?: string;
    kind?: string;
    published_at?: string | number;
    external_id?: string;
    keywords_hint?: string[];
    payload?: string | Record<string, unknown>;
  }>;
};

/** Hydrate / seed JSON items (no live feed fetch). Live cron lives on ingest Worker. */
internalRoutes.post("/internal/ingest", async (c) => {
  if (!bearerOk(c.req.header("authorization"), c.env.INGEST_TOKEN)) {
    return c.json({ error: "unauthorized" }, 401);
  }

  let body: IngestBody;
  try {
    body = (await c.req.json()) as IngestBody;
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const items: FeedItem[] = [];
  for (const raw of body.items ?? []) {
    const topicRaw = raw?.topic ?? raw?.section;
    if (!raw?.url || !raw.title || !raw.source || !topicRaw) continue;
    if (!isTopicId(topicRaw)) continue;
    let published: number;
    if (typeof raw.published_at === "number") {
      published = raw.published_at > 1e12 ? Math.floor(raw.published_at / 1000) : raw.published_at;
    } else if (typeof raw.published_at === "string") {
      published = Math.floor(Date.parse(raw.published_at) / 1000);
    } else {
      published = now;
    }
    if (!Number.isFinite(published)) continue;
    const id = await sha256Hex(raw.url);
    const kind: ItemKind = raw.kind === "quote" ? "quote" : "article";
    const payload =
      typeof raw.payload === "string"
        ? raw.payload
        : JSON.stringify(raw.payload ?? {});
    items.push({
      id,
      url: raw.url,
      title: sanitizeFeedText(raw.title, 300),
      summary: sanitizeFeedText(raw.summary ?? "", 800),
      source: sanitizeFeedText(raw.source, 64),
      topic: topicRaw as TopicId,
      kind,
      published_at: published,
      ingested_at: now,
      external_id: sanitizeFeedText(raw.external_id ?? "", 200),
      keywords_hint: Array.isArray(raw.keywords_hint)
        ? raw.keywords_hint.filter((k): k is string => typeof k === "string").slice(0, 20)
        : [],
      payload,
    });
  }

  const written = await upsertItems(c.env.DB, items);
  return c.json({ written, received: body.items?.length ?? 0 });
});

internalRoutes.get("/internal/facilitator-probe", async (c) => {
  if (!bearerOk(c.req.header("authorization"), c.env.INGEST_TOKEN)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const url = `${c.env.FACILITATOR_URL.replace(/\/$/, "")}/supported`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    return c.json({
      ok: res.ok,
      status: res.status,
      url,
      body_prefix: text.slice(0, 200),
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        url,
        error: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }
});
