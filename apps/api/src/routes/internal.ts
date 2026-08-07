import { Hono } from "hono";
import type { FeedItem, SectionId } from "@x402-agent-api/shared";
import { isSectionId, sanitizeFeedText, sha256Hex } from "@x402-agent-api/shared";
import type { Env } from "../env";
import { upsertItems } from "../store/items";
import { bearerOk } from "./internal_auth";

export const internalRoutes = new Hono<{ Bindings: Env }>();

type IngestBody = {
  items?: Array<{
    url: string;
    title: string;
    summary?: string;
    source: string;
    section: string;
    published_at?: string;
    keywords_hint?: string[];
  }>;
};

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
    if (!raw?.url || !raw.title || !raw.source || !raw.section) continue;
    if (!isSectionId(raw.section)) continue;
    const published = raw.published_at
      ? Math.floor(Date.parse(raw.published_at) / 1000)
      : now;
    if (!Number.isFinite(published)) continue;
    const id = await sha256Hex(raw.url);
    items.push({
      id,
      url: raw.url,
      title: sanitizeFeedText(raw.title, 300),
      summary: sanitizeFeedText(raw.summary ?? "", 800),
      source: sanitizeFeedText(raw.source, 64),
      section: raw.section as SectionId,
      published_at: published,
      ingested_at: now,
      keywords_hint: Array.isArray(raw.keywords_hint)
        ? raw.keywords_hint.filter((k): k is string => typeof k === "string").slice(0, 20)
        : [],
    });
  }

  const written = await upsertItems(c.env.DB, items);
  return c.json({ written, received: body.items?.length ?? 0 });
});

/** Local debug: raw facilitator reachability from the Worker runtime. */
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
