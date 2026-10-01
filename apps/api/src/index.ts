import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { securityMiddleware } from "./middleware/security";
import { getPaymentMiddleware } from "./x402/middleware";
import { healthRoutes } from "./routes/health";
import { briefRoutes } from "./routes/brief";
import { internalRoutes } from "./routes/internal";
import {
  handleFaviconIco,
  handleFaviconSvg,
  handleOgImage,
  handleOgImagePng,
  handleRoot,
} from "./routes/home";

const app = new Hono<{ Bindings: Env }>();

app.use("*", securityMiddleware);
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "HEAD", "POST", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.get("/", handleRoot);
app.get("/favicon.ico", handleFaviconIco);
app.get("/favicon.svg", handleFaviconSvg);
app.get("/og-image.png", handleOgImagePng);
app.get("/og-image.svg", handleOgImage);

app.get("/robots.txt", (c) =>
  c.text("User-agent: *\nAllow: /\n", 200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  }),
);

app.get("/llms.txt", (c) => {
  return c.text(
    [
      "# x402-agent-api",
      "",
      "Paid Algorand x402 agent endpoints.",
      "Flagship: POST /v1/brief — keyword multi-topic intel brief with citations.",
      "Facilitator: GoPlausible. Tag: x402-global-challenge.",
      "Feed cron: separate Worker x402-agent-ingest.",
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

export default {
  fetch: app.fetch,
};
