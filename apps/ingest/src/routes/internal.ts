import { Hono } from "hono";
import type { Env } from "../env";
import { bearerOk } from "../auth";
import { runHourlyIngest, runIngestJob, type IngestJob } from "../cron/ingest";

export const internalRoutes = new Hono<{ Bindings: Env }>();

internalRoutes.get("/health", (c) => {
  return c.json({ ok: true, service: "x402-agent-ingest" });
});

/** Trigger Wave1 fetch+normalize+upsert (local/dev ops; bearer auth). */
internalRoutes.post("/internal/run-ingest", async (c) => {
  if (!bearerOk(c.req.header("authorization"), c.env.INGEST_TOKEN)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  let job: IngestJob | "hourly" = "hourly";
  try {
    const body = (await c.req.json()) as { job?: string };
    if (
      body.job === "quotes" ||
      body.job === "feeds" ||
      body.job === "tldr" ||
      body.job === "hourly"
    ) {
      job = body.job;
    }
  } catch {
    /* default hourly */
  }
  if (job === "hourly") {
    return c.json(await runHourlyIngest(c.env));
  }
  return c.json(await runIngestJob(c.env, job));
});
