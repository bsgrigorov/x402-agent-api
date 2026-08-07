#!/usr/bin/env tsx
/**
 * Print ALGO + USDC balances / opt-in status for merchant + payer (no secrets).
 *
 * Usage:
 *   pnpm wallets:check
 *   pnpm wallets:check -- --file ./apps/api/.wallets.testnet.json
 */
import {
  ALGOD,
  argValue,
  defaultWalletsPath,
  readWallets,
  usdcAsaFor,
  type NetworkName,
} from "./lib/wallets.ts";

async function checkAddress(
  label: string,
  address: string,
  network: NetworkName,
): Promise<void> {
  const asa = usdcAsaFor(network);
  const url = `${ALGOD[network]}/v2/accounts/${address}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(JSON.stringify({ label, address, error: `${res.status} ${res.statusText}` }));
    return;
  }
  const j = (await res.json()) as {
    amount?: number;
    "min-balance"?: number;
    assets?: Array<{ "asset-id"?: number; amount?: number }>;
  };
  const usdc = (j.assets ?? []).find((a) => a["asset-id"] === asa);
  console.log(
    JSON.stringify(
      {
        label,
        address,
        network,
        algo: (j.amount ?? 0) / 1e6,
        min_balance_algo: (j["min-balance"] ?? 0) / 1e6,
        opted_in_usdc: Boolean(usdc),
        usdc: usdc ? (usdc.amount ?? 0) / 1e6 : 0,
        asa,
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const network = (argValue("--network") ?? "testnet") as NetworkName;
  const filePath = argValue("--file") ?? defaultWalletsPath();
  const wallets = readWallets(filePath);
  await checkAddress("merchant", wallets.merchant.address, network);
  await checkAddress("payer", wallets.payer.address, network);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
