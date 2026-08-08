/**
 * Wave1 ingest for Workers cron — adapters extract, gate normalizes, D1 upserts.
 * No LLM. Jobs: quotes | feeds | tldr (see wrangler crons).
 */
import {
  gateCandidates,
  resolveAdapter,
  type SourceDef,
} from "@x402-agent-api/aggregator";
import { upsertItems } from "@x402-agent-api/db";
import { feedsForJob } from "@x402-agent-api/feeds";
import type { FeedItem } from "@x402-agent-api/shared";
import type { Env } from "../env";

const UA =
  "x402-agent-ingest/0.2 (+https://x402.darkhold.dev; morning-brief ingest)";

const CONCURRENCY = 5;

export type IngestJob = "quotes" | "feeds" | "tldr";

export type IngestResult = {
  job: IngestJob;
  sources: number;
  ok: number;
  written: number;
  errors: string[];
};

async function fetchBody(source: SourceDef): Promise<string> {
  const res = await fetch(source.url, {
    headers: {
      "user-agent": UA,
      accept: "*/*",
      ...(source.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return out;
}

async function ingestOne(
  source: SourceDef,
  now: number,
  tldrExpand: boolean,
): Promise<{ items: FeedItem[]; error?: string; note?: string }> {
  try {
    const body = await fetchBody(source);
    const adapter = resolveAdapter(source);
    const { candidates, note } = await adapter.extract({
      source,
      body,
      nowUnix: now,
      options: {
        tldrExpand,
        tldrEditions: 2,
        keepEditionIndex: false,
      },
    });
    const perFeedCap = adapter.name === "tldr" ? 80 : undefined;
    const maxAgeS =
      source.max_age_hours != null ? Math.round(source.max_age_hours * 3600) : undefined;
    const { items } = await gateCandidates(candidates, {
      source: source.id,
      topic: source.topic,
      ingestedAt: now,
      perFeedCap,
      maxAgeS,
    });
    return { items, note };
  } catch (e) {
    return {
      items: [],
      error: `${source.id}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function runIngestJob(env: Env, job: IngestJob): Promise<IngestResult> {
  const sources = feedsForJob(job);
  const now = Math.floor(Date.now() / 1000);
  const tldrExpand = job === "tldr";
  const errors: string[] = [];
  let ok = 0;
  const collected: FeedItem[] = [];

  const results = await mapPool(sources, CONCURRENCY, (source) =>
    ingestOne(source, now, tldrExpand),
  );

  for (const r of results) {
    if (r.error) errors.push(r.error);
    else ok += 1;
    collected.push(...r.items);
  }

  const byUrl = new Map<string, FeedItem>();
  for (const item of collected) byUrl.set(item.url, item);
  const written = await upsertItems(env.DB, [...byUrl.values()]);

  return { job, sources: sources.length, ok, written, errors: errors.slice(0, 20) };
}

/** Hourly: quotes then feeds (one cold start). */
export async function runHourlyIngest(env: Env): Promise<{
  quotes: IngestResult;
  feeds: IngestResult;
}> {
  const quotes = await runIngestJob(env, "quotes");
  const feeds = await runIngestJob(env, "feeds");
  return { quotes, feeds };
}
