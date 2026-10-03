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
 *   BASE_URL=https://x402.darkhold.dev ../ops/scripts/with-wallets.sh e2e:pay-brief -- --count 5 --quiet
 */
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
  ExactAvmScheme,
  toClientAvmSigner,
} from "@x402/avm";
import {
  ALGORAND_MAINNET_FACILITATOR_CAIP2,
  ALGORAND_TESTNET_FACILITATOR_CAIP2,
  argFlag,
  argValue,
  defaultWalletsPath,
  readWallets,
} from "./lib/wallets.ts";

function registerAvmClient(client: x402Client, signer: ReturnType<typeof toClientAvmSigner>, network: string): string {
  const mainnet = network === "algorand-mainnet";
  if (mainnet) {
    client.register(ALGORAND_MAINNET_FACILITATOR_CAIP2, new ExactAvmScheme(signer));
    client.register(ALGORAND_MAINNET_CAIP2, new ExactAvmScheme(signer));
    return ALGORAND_MAINNET_FACILITATOR_CAIP2;
  }
  client.register(ALGORAND_TESTNET_FACILITATOR_CAIP2, new ExactAvmScheme(signer));
  client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));
  return ALGORAND_TESTNET_FACILITATOR_CAIP2;
}

function parseCount(): number {
  const raw = argValue("--count") ?? "1";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new Error("--count must be an integer 1–100");
  }
  return n;
}

async function main(): Promise<void> {
  const quiet = argFlag("--quiet");
  const count = parseCount();
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
  const networkCaip2 = registerAvmClient(client, signer, wallets.network);

  const fetchPaid = wrapFetchWithPayment(fetch, client);
  // Broad multi-topic request — keywords refine ranking; empty hits backfill with freshest.
  const body = {
    keywords: ["kubernetes", "bitcoin", "fed", "cve", "llm", "openai", "cloudflare"],
    topics: ["tech", "crypto", "markets", "security", "ai", "finance", "world", "infra"],
    max_items_per_topic: 5,
    format: "json",
  };

  if (!quiet) {
    console.log(
      JSON.stringify({
        base,
        payer: signer.address,
        merchant: wallets.merchant.address,
        network: networkCaip2,
        count,
      }),
    );
  }

  const results: Array<{ i: number; ok: boolean; tx?: string; status: number }> = [];

  for (let i = 1; i <= count; i++) {
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
      console.error(JSON.stringify({ i, status: response.status, body: json }));
      process.exit(1);
    }

    const settle = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
      response.headers.get(name),
    );
    const tx =
      settle && typeof settle === "object" && "transaction" in settle
        ? String((settle as { transaction?: string }).transaction ?? "")
        : "";
    results.push({ i, ok: true, tx, status: response.status });

    if (quiet) {
      console.log(JSON.stringify({ i, tx, success: (settle as { success?: boolean })?.success }));
    } else {
      console.log("settled", JSON.stringify(settle, null, 2));
      console.log("brief", JSON.stringify(json, null, 2));
      console.log("OK", response.status, `(${i}/${count})`);
    }
  }

  if (quiet && count > 1) {
    console.log(JSON.stringify({ done: count, txs: results.map((r) => r.tx) }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
