#!/usr/bin/env tsx
/**
 * Replace only the payer wallet; keep merchant / PAY_TO unchanged.
 *
 * Usage:
 *   pnpm wallets:new-payer
 *   pnpm wallets:new-payer -- --vault
 *
 * Afterward: fund ALGO → pnpm wallets:opt-in -- --role payer → Circle USDC faucet.
 */
import { generateAccount, secretKeyToMnemonic } from "algosdk";
import {
  argFlag,
  argValue,
  defaultVaultPath,
  defaultWalletsPath,
  publicSummary,
  readWallets,
  writeSecretsFile,
  type WalletRecord,
} from "./lib/wallets.ts";

function main(): void {
  const path = argValue("--file") ?? defaultWalletsPath();
  const wallets = readWallets(path);
  const oldPayer = wallets.payer.address;

  const acct = generateAccount();
  const payer: WalletRecord = {
    role: "payer",
    address: acct.addr.toString(),
    mnemonic: secretKeyToMnemonic(acct.sk),
    privateKeyBase64: Buffer.from(acct.sk).toString("base64"),
  };

  wallets.payer = payer;
  wallets.created_at = new Date().toISOString();
  wallets.notes = [
    ...wallets.notes.filter((n) => !n.startsWith("Payer rotated")),
    `Payer rotated ${wallets.created_at}; previous payer was ${oldPayer}`,
  ];

  writeSecretsFile(path, wallets);
  console.log("updated", path);
  console.log({
    ...publicSummary(wallets),
    previous_payer: oldPayer,
  });

  if (argFlag("--vault")) {
    const vault = argValue("--vault-path") ?? defaultVaultPath();
    writeSecretsFile(vault, wallets);
    console.log("wrote vault copy", vault);
  }

  console.log("\nNext:");
  console.log("1) Fund NEW payer with Testnet ALGO:", payer.address);
  console.log("   https://lora.algokit.io/testnet/fund");
  console.log("2) pnpm wallets:opt-in -- --role payer");
  console.log("3) Circle USDC faucet → same payer address (opt-in first!)");
  console.log("4) pnpm wallets:check");
}

main();
