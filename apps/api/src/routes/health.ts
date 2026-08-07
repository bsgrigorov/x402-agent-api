import { Hono } from "hono";
import type { Env } from "../env";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "x402-agent-api",
    network: c.env.NETWORK,
  });
});
