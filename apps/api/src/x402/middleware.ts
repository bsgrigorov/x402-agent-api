import type { MiddlewareHandler } from "hono";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/hono";
import type { PaymentOption, RoutesConfig } from "@x402/core/http";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { USDC_MAINNET_ASA_ID, USDC_TESTNET_ASA_ID } from "@x402/avm";
import type { Env } from "../env";
import { createFacilitatorClient } from "./facilitator";
import {
  ALGORAND_MAINNET_FACILITATOR_CAIP2,
  ALGORAND_TESTNET_FACILITATOR_CAIP2,
} from "./networks";

export const CHALLENGE_TAG = "x402-global-challenge";
export {
  ALGORAND_MAINNET_FACILITATOR_CAIP2,
  ALGORAND_TESTNET_FACILITATOR_CAIP2,
} from "./networks";

type Caip2Network = `${string}:${string}`;

function networkCaip2(network: Env["NETWORK"]): Caip2Network {
  return network === "ALGORAND_Mainnet_CAIP2"
    ? ALGORAND_MAINNET_FACILITATOR_CAIP2
    : ALGORAND_TESTNET_FACILITATOR_CAIP2;
}

function usdcAsa(network: Env["NETWORK"]): string {
  return network === "ALGORAND_Mainnet_CAIP2"
    ? String(USDC_MAINNET_ASA_ID)
    : String(USDC_TESTNET_ASA_ID);
}

function priceDollar(priceUsdc: string): `$${string}` {
  const n = Number(priceUsdc);
  if (!Number.isFinite(n) || n <= 0) return "$0.05";
  return `$${n}`;
}

function cacheKey(env: Env): string {
  return [
    env.NETWORK,
    env.PAY_TO,
    env.FACILITATOR_URL,
    env.BRIEF_PRICE_USDC,
    env.DEV_BYPASS_SECRET ?? "",
  ].join("|");
}

type CachedMw = { key: string; mw: MiddlewareHandler };

let cached: CachedMw | null = null;

/** True when Testnet unpaid smoke bypass header matches. */
export function hasDevBypass(env: Env, header: string | undefined): boolean {
  if (!env.DEV_BYPASS_SECRET) return false;
  if (env.NETWORK === "ALGORAND_Mainnet_CAIP2") return false;
  return Boolean(header && header === env.DEV_BYPASS_SECRET);
}

/**
 * Cached payment middleware for this isolate.
 * Creates once per env fingerprint so facilitator initialize() is not re-run every request.
 */
export function getPaymentMiddleware(env: Env): MiddlewareHandler {
  const key = cacheKey(env);
  if (cached?.key === key) return cached.mw;
  const mw = createPaymentMiddleware(env);
  cached = { key, mw };
  return mw;
}

/**
 * Build x402 payment middleware for this Worker env.
 * Kept separate from product handlers so new paid routes only extend route config.
 *
 * Bazaar/discovery extensions omitted for MVP: Workers disallow Ajv `new Function`
 * schema codegen. Challenge tag stays in `extra.tag` for listing.
 */
export function createPaymentMiddleware(env: Env): MiddlewareHandler {
  if (
    env.NETWORK === "ALGORAND_Mainnet_CAIP2" &&
    env.DEV_BYPASS_SECRET &&
    env.DEV_BYPASS_SECRET.length > 0
  ) {
    throw new Error("DEV_BYPASS_SECRET must not be set on Mainnet prod");
  }

  // Local Testnet: allow /supported snapshot when workerd outbound HTTPS is broken.
  const allowSupportedFallback =
    env.NETWORK !== "ALGORAND_Mainnet_CAIP2" && Boolean(env.DEV_BYPASS_SECRET);

  const facilitatorClient = createFacilitatorClient(
    env.FACILITATOR_URL,
    allowSupportedFallback,
  );
  const server = new x402ResourceServer(facilitatorClient);
  const caip2 = networkCaip2(env.NETWORK);
  // Wildcard so truncated + full genesis CAIP-2 both resolve to Exact AVM.
  server.register("algorand:*", new ExactAvmScheme());

  const briefAccept: PaymentOption = {
    scheme: "exact",
    price: priceDollar(env.BRIEF_PRICE_USDC),
    network: caip2,
    payTo: env.PAY_TO,
    extra: {
      asset: usdcAsa(env.NETWORK),
      tag: CHALLENGE_TAG,
    },
  };

  const routes: RoutesConfig = {
    "POST /v1/brief": {
      accepts: [briefAccept],
      description:
        "Keyword-filtered multi-section intel brief with source links (extractive; citations from retrieved feed items)",
      mimeType: "application/json",
    },
  };

  const httpServer = new x402HTTPResourceServer(server, routes);

  // false = do not kick off initialize() at middleware construction (Workers-friendly).
  const mw = paymentMiddlewareFromHTTPServer(httpServer, undefined, undefined, false);

  // Lazy one-shot facilitator /supported fetch. Library skips this when sync=false.
  let init: Promise<void> | null = null;
  return async (c, next) => {
    // Bypass before facilitator round-trip so local product smoke works offline.
    if (hasDevBypass(env, c.req.header("x-dev-bypass"))) {
      return next();
    }
    if (!init) {
      init = httpServer.initialize().catch((err) => {
        init = null;
        throw err;
      });
    }
    await init;
    return mw(c, next);
  };
}
