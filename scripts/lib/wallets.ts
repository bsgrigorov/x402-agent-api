/**
 * Shared wallet-file helpers for Testnet ops scripts.
 * Secrets stay on disk (gitignored); scripts never print mnemonics.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const USDC_TESTNET_ASA_ID = 10458941;
export const USDC_MAINNET_ASA_ID = 31566704;

/** Full genesis-hash CAIP-2 (GoPlausible /supported). Prefer over truncated @x402/avm consts. */
export const ALGORAND_TESTNET_FACILITATOR_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;
export const ALGORAND_MAINNET_FACILITATOR_CAIP2 =
  "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=" as const;

export const ALGOD = {
  testnet: "https://testnet-api.algonode.cloud",
  mainnet: "https://mainnet-api.algonode.cloud",
} as const;

export type NetworkName = keyof typeof ALGOD;

export type WalletRole = "merchant" | "payer";

export type WalletRecord = {
  role: WalletRole;
  address: string;
  mnemonic: string;
  privateKeyBase64: string;
};

export type WalletsFile = {
  network: string;
  created_at: string;
  usdc_asa_id: string;
  funding: { algo: string; usdc: string };
  notes: string[];
  merchant: WalletRecord;
  payer: WalletRecord;
};

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "../..");

export function defaultWalletsPath(): string {
  return resolve(
    process.env.WALLETS_FILE ?? resolve(repoRoot, "apps/api/.wallets.testnet.json"),
  );
}

export function defaultVaultPath(): string {
  return resolve(
    process.env.WALLETS_VAULT_FILE ??
      `${process.env.HOME}/dev/repos/kb/kb-vault-private/projects/algorand-x402/testnet-wallets.json`,
  );
}

export function defaultDevVarsPath(): string {
  return resolve(
    process.env.DEV_VARS_FILE ?? resolve(repoRoot, "apps/api/.dev.vars"),
  );
}

export function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

export function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function readWallets(path = defaultWalletsPath()): WalletsFile {
  if (!existsSync(path)) {
    throw new Error(`Wallets file not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as WalletsFile;
}

export function writeSecretsFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function usdcAsaFor(network: NetworkName): number {
  return network === "mainnet" ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;
}

export function publicSummary(w: WalletsFile): Record<string, string> {
  return {
    network: w.network,
    merchant: w.merchant.address,
    payer: w.payer.address,
    usdc_asa_id: w.usdc_asa_id,
  };
}
