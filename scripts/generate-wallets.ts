#!/usr/bin/env tsx
/**
 * Generate merchant + payer Algorand wallets for x402 Testnet (or Mainnet) ops.
 *
 * Usage:
 *   pnpm wallets:generate
 *   pnpm wallets:generate -- --force --write-dev-vars --vault
 *   WALLETS_FILE=./apps/api/.wallets.mainnet.json pnpm wallets:generate -- --network mainnet
 *
 * Never commits keys. Default output is gitignored apps/api/.wallets.testnet.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generateAccount, secretKeyToMnemonic } from "algosdk";
import {
  argFlag,
  argValue,
  defaultDevVarsPath,
  defaultVaultPath,
  defaultWalletsPath,
  publicSummary,
  usdcAsaFor,
  writeSecretsFile,
  type NetworkName,
  type WalletRecord,
  type WalletRole,
  type WalletsFile,
} from "./lib/wallets.ts";

function wallet(role: WalletRole): WalletRecord {
  const acct = generateAccount();
  return {
    role,
    address: acct.addr.toString(),
    mnemonic: secretKeyToMnemonic(acct.sk),
    privateKeyBase64: Buffer.from(acct.sk).toString("base64"),
  };
}

function patchPayTo(devVarsPath: string, payTo: string): void {
  let text = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
  if (/^PAY_TO=/m.test(text)) {
    text = text.replace(/^PAY_TO=.*$/m, `PAY_TO=${payTo}`);
  } else {
    text = `${text.trimEnd()}\nPAY_TO=${payTo}\n`;
  }
  writeFileSync(devVarsPath, text.endsWith("\n") ? text : `${text}\n`);
}

function main(): void {
  const network = (argValue("--network") ?? "testnet") as NetworkName;
  if (network !== "testnet" && network !== "mainnet") {
    console.error("--network must be testnet|mainnet");
    process.exit(1);
  }
  if (network === "mainnet" && !argFlag("--i-understand-mainnet")) {
    console.error("Refusing Mainnet without --i-understand-mainnet");
    process.exit(1);
  }

  const outPath = argValue("--out") ?? defaultWalletsPath();
  if (existsSync(outPath) && !argFlag("--force")) {
    console.error(`Refusing to overwrite ${outPath} (pass --force)`);
    process.exit(1);
  }

  const asa = usdcAsaFor(network);
  const file: WalletsFile = {
    network: `algorand-${network}`,
    created_at: new Date().toISOString(),
    usdc_asa_id: String(asa),
    funding: {
      algo:
        network === "testnet"
          ? "https://lora.algokit.io/testnet/fund"
          : "fund Mainnet ALGO from your exchange/wallet",
      usdc:
        network === "testnet"
          ? "https://faucet.circle.com/ (select Algorand Testnet)"
          : "acquire Mainnet USDC ASA 31566704",
    },
    notes: [
      "Merchant = PAY_TO receive address. Must opt into USDC ASA before receiving payments.",
      "Payer = client wallet for E2E settle. Needs ALGO + USDC.",
      "Never commit this file. Never reuse Testnet keys on Mainnet.",
    ],
    merchant: wallet("merchant"),
    payer: wallet("payer"),
  };

  writeSecretsFile(outPath, file);
  console.log("wrote", outPath);
  console.log(publicSummary(file));

  if (argFlag("--vault")) {
    const vault = argValue("--vault-path") ?? defaultVaultPath();
    writeSecretsFile(vault, file);
    console.log("wrote vault copy", vault);
  }

  if (argFlag("--write-dev-vars")) {
    const varsPath = argValue("--dev-vars") ?? defaultDevVarsPath();
    patchPayTo(varsPath, file.merchant.address);
    console.log(`updated PAY_TO in ${varsPath}`);
  }

  console.log("\nNext:");
  console.log("1) Fund both addresses with ALGO");
  console.log(`2) pnpm wallets:opt-in -- --file ${outPath}`);
  console.log("3) Fund payer with USDC (Circle faucet on Testnet)");
  console.log("4) pnpm wallets:check -- --file", outPath);
}

main();
