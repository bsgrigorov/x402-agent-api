import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { getPaymentMiddleware } from "./x402/middleware";
import { healthRoutes } from "./routes/health";
import { briefRoutes } from "./routes/brief";
import { internalRoutes } from "./routes/internal";
import { runHourlyIngest, runIngestJob } from "./cron/ingest";
import { cleanupOldItems } from "./cron/cleanup";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    name: "x402-agent-api",
    product: "morning-brief",
    endpoints: {
      health: "GET /health",
      brief: "POST /v1/brief (x402)",
      ingest: "POST /internal/ingest (bearer)",
    },
  });
});

app.get("/llms.txt", (c) => {
  return c.text(
    [
      "# x402-agent-api",
      "",
      "Paid Algorand x402 agent endpoints.",
      "Flagship: POST /v1/brief — keyword multi-topic intel brief with citations.",
      "Facilitator: GoPlausible. Tag: x402-global-challenge.",
      "",
    ].join("\n"),
  );
});

app.get("/.well-known/x402.json", (c) => {
  return c.json({
    name: "x402-agent-api",
    description: "Pay-per-request agent APIs on Algorand x402",
    facilitator: c.env.FACILITATOR_URL,
    network: c.env.NETWORK,
    routes: ["POST /v1/brief"],
  });
});

app.route("/", healthRoutes);
app.route("/", internalRoutes);

app.use("*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/v1/brief") {
    return getPaymentMiddleware(c.env)(c, next);
  }
  return next();
});

app.route("/", briefRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

/** Cron strings must match wrangler.jsonc triggers. */
const CRON_HOURLY = "0 * * * *";
const CRON_TLDR = "0 */6 * * *";
const CRON_CLEANUP = "15 5 * * *";

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const cron = controller.cron;
    ctx.waitUntil(
      (async () => {
        if (cron === CRON_CLEANUP) {
          const deleted = await cleanupOldItems(env);
          console.log("cron cleanup", { deleted });
          return;
        }
        if (cron === CRON_TLDR) {
          const tldr = await runIngestJob(env, "tldr");
          console.log("cron tldr", tldr);
          return;
        }
        // Default / hourly: quotes + feeds
        if (cron === CRON_HOURLY || !cron) {
          const hourly = await runHourlyIngest(env);
          console.log("cron hourly", hourly);
          return;
        }
        console.log("cron unknown", { cron });
      })(),
    );
  },
};
