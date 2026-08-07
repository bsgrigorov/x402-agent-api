#!/usr/bin/env tsx
/**
 * Paid E2E: POST /v1/brief with Exact AVM settle via GoPlausible (no x-dev-bypass).
 *
 * Prerequisites:
 *   - pnpm dev running (local Worker)
 *   - payer opted into USDC + funded (pnpm wallets:check)
 *   - merchant opted into USDC (receive)
 *
 * Usage:
 *   pnpm e2e:pay-brief
 *   BASE_URL=http://127.0.0.1:8787 pnpm e2e:pay-brief
 */
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactAvmScheme, toClientAvmSigner } from "@x402/avm";
import {
  ALGORAND_TESTNET_FACILITATOR_CAIP2,
  argValue,
  defaultWalletsPath,
  readWallets,
} from "./lib/wallets.ts";

async function main(): Promise<void> {
  const base = (argValue("--base") ?? process.env.BASE_URL ?? "http://127.0.0.1:8787").replace(
    /\/$/,
    "",
  );
  const wallets = readWallets(argValue("--file") ?? defaultWalletsPath());
  const signer = toClientAvmSigner(wallets.payer.privateKeyBase64);
  if (signer.address !== wallets.payer.address) {
    throw new Error(
      `payer key/address mismatch: signer=${signer.address} file=${wallets.payer.address}`,
    );
  }

  const client = new x402Client();
  // Full genesis CAIP-2 (what GoPlausible + our server advertise).
  client.register(ALGORAND_TESTNET_FACILITATOR_CAIP2, new ExactAvmScheme(signer));
  // Truncated CAIP-2 profile (first 32 chars) used by @x402/avm constants.
  client.register("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe", new ExactAvmScheme(signer));

  const fetchPaid = wrapFetchWithPayment(fetch, client);
  const body = {
    keywords: ["kubernetes"],
    sections: ["tech"],
    format: "json",
  };

  console.log(
    JSON.stringify({
      base,
      payer: signer.address,
      merchant: wallets.merchant.address,
      network: ALGORAND_TESTNET_FACILITATOR_CAIP2,
    }),
  );

  const response = await fetchPaid(`${base}/v1/brief`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text
  }

  if (!response.ok) {
    console.error("FAILED", response.status, json);
    process.exit(1);
  }

  const settle = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
    response.headers.get(name),
  );
  console.log("settled", JSON.stringify(settle, null, 2));
  console.log("brief", JSON.stringify(json, null, 2));
  console.log("OK", response.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
