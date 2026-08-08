import { Hono } from "hono";
import type { BriefRequest, TopicId } from "@x402-agent-api/shared";
import { isTopicId, sha256Hex } from "@x402-agent-api/shared";
import type { Env } from "../env";
import { buildBrief } from "../brief/service";
import { appendCost, appendRevenue } from "../store/ledger";
import { claimPaymentKey } from "../store/payments";

export const briefRoutes = new Hono<{ Bindings: Env }>();

function parseBody(raw: unknown): BriefRequest {
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON body required");
  }
  const body = raw as Record<string, unknown>;
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter((k): k is string => typeof k === "string")
    : [];
  // Accept topics (new) or sections (legacy alias during cutover)
  const topicsRaw = Array.isArray(body.topics)
    ? body.topics
    : Array.isArray(body.sections)
      ? body.sections
      : [];
  const topics = topicsRaw.filter(
    (s): s is TopicId => typeof s === "string" && isTopicId(s),
  );
  if (topics.length === 0) {
    throw new Error("topics must include at least one known topic id");
  }
  const format = body.format === "json" ? "json" : "markdown";
  const max =
    typeof body.max_items_per_topic === "number"
      ? body.max_items_per_topic
      : typeof body.max_items_per_section === "number"
        ? body.max_items_per_section
        : undefined;
  const synthesize = body.synthesize === true;
  return { keywords, topics, format, max_items_per_topic: max, synthesize };
}

briefRoutes.post("/v1/brief", async (c) => {
  let req: BriefRequest;
  try {
    req = parseBody(await c.req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid body";
    return c.json({ error: message }, 400);
  }

  const priceUsdc = Number(c.env.BRIEF_PRICE_USDC) || 0.05;
  const requestId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const paymentHeader =
    c.req.header("payment-signature") ?? c.req.header("x-payment");
  let paymentKey: string | null = null;
  if (paymentHeader) {
    paymentKey = await sha256Hex(paymentHeader);
    const claimed = await claimPaymentKey(c.env.DB, paymentKey, requestId);
    if (!claimed) {
      return c.json({ error: "payment_already_used" }, 409);
    }
  }

  let brief;
  try {
    brief = await buildBrief(c.env.DB, req, priceUsdc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "brief failed";
    return c.json({ error: message }, 400);
  }

  await appendRevenue(c.env.DB, {
    id: crypto.randomUUID(),
    request_id: requestId,
    sku: "brief",
    price_usdc: priceUsdc,
    payer: null,
    // ponytail: store payment header hash until we plumb settle tx id post-handler
    tx_id: paymentKey,
    network: c.env.NETWORK,
    settled_at: now,
  });
  await appendCost(c.env.DB, {
    id: crypto.randomUUID(),
    request_id: requestId,
    kind: "llm",
    provider: null,
    model: "extractive",
    tokens_in: null,
    tokens_out: null,
    cost_usd: 0,
    skip_reason: "extractive",
    created_at: now,
  });

  if (req.format === "json") {
    const { brief_markdown: _, ...rest } = brief;
    return c.json({ ...rest, request_id: requestId });
  }
  return c.json({ ...brief, request_id: requestId });
});
