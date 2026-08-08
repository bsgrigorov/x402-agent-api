import { Hono } from "hono";
import type { Env } from "./env";
import { runHourlyIngest, runIngestJob } from "./cron/ingest";
import { cleanupOldItems } from "./cron/cleanup";
import { internalRoutes } from "./routes/internal";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({
    name: "x402-agent-ingest",
    endpoints: {
      health: "GET /health",
      runIngest: "POST /internal/run-ingest (bearer)",
    },
  });
});

app.route("/", internalRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

/**
 * Free-plan friendly: one hourly cron fans out jobs.
 * - every hour: quotes + feeds
 * - hour % 6 === 0: tldr expand
 * - hour === 5: retention cleanup (was 15 5 * * *)
 */
const CRON_HOURLY = "0 * * * *";

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const cron = controller.cron;
    ctx.waitUntil(
      (async () => {
        if (cron && cron !== CRON_HOURLY) {
          console.log("cron unknown", { cron });
          return;
        }
        const hour = new Date().getUTCHours();
        const hourly = await runHourlyIngest(env);
        console.log("cron hourly", hourly);
        if (hour % 6 === 0) {
          const tldr = await runIngestJob(env, "tldr");
          console.log("cron tldr", tldr);
        }
        if (hour === 5) {
          const deleted = await cleanupOldItems(env);
          console.log("cron cleanup", { deleted });
        }
      })(),
    );
  },
};
