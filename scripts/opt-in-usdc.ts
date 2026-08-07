#!/usr/bin/env tsx
/**
 * Opt merchant and/or payer into USDC ASA so the account can hold/receive the asset.
 *
 * On Algorand, receiving an ASA requires a prior opt-in (0-amount asset transfer to self).
 * Funding ALGO alone is not enough; Circle/faucet USDC send will fail without opt-in.
 *
 * Usage:
 *   pnpm wallets:opt-in
 *   pnpm wallets:opt-in -- --role merchant
 *   pnpm wallets:opt-in -- --file ./apps/api/.wallets.testnet.json --network testnet
 */
import algosdk from "algosdk";
import {
  ALGOD,
  argFlag,
  argValue,
  defaultWalletsPath,
  readWallets,
  usdcAsaFor,
  type NetworkName,
  type WalletRole,
} from "./lib/wallets.ts";

async function optInRole(
  role: WalletRole,
  mnemonic: string,
  expectedAddress: string,
  network: NetworkName,
): Promise<void> {
  const asa = usdcAsaFor(network);
  const algod = new algosdk.Algodv2("", ALGOD[network], "");
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const address = account.addr.toString();
  if (address !== expectedAddress) {
    throw new Error(`${role}: mnemonic does not match address ${expectedAddress}`);
  }

  const info = await algod.accountInformation(account.addr).do();
  const assets = info.assets ?? [];
  const already = assets.some((a) => Number(a.assetId ?? a["asset-id"]) === asa);
  if (already) {
    console.log(JSON.stringify({ role, address, status: "already_opted_in", asa }));
    return;
  }

  const sp = await algod.getTransactionParams().do();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: account.addr,
    amount: 0,
    assetIndex: asa,
    suggestedParams: sp,
  });
  const signed = txn.signTxn(account.sk);
  const { txid } = await algod.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(algod, txid, 8);

  const after = await algod.accountInformation(account.addr).do();
  const usdc = (after.assets ?? []).find(
    (a) => Number(a.assetId ?? a["asset-id"]) === asa,
  );
  console.log(
    JSON.stringify({
      role,
      address,
      status: "opted_in",
      asa,
      txid,
      usdc_amount: usdc ? Number(usdc.amount) : null,
    }),
  );
}

async function main(): Promise<void> {
  const network = (argValue("--network") ?? "testnet") as NetworkName;
  if (network !== "testnet" && network !== "mainnet") {
    console.error("--network must be testnet|mainnet");
    process.exit(1);
  }
  if (network === "mainnet" && !argFlag("--i-understand-mainnet")) {
    console.error("Refusing Mainnet without --i-understand-mainnet");
    process.exit(1);
  }

  const filePath = argValue("--file") ?? defaultWalletsPath();
  const wallets = readWallets(filePath);
  const roleArg = argValue("--role") as WalletRole | undefined;
  const roles: WalletRole[] =
    roleArg === "merchant" || roleArg === "payer" ? [roleArg] : ["merchant", "payer"];

  for (const role of roles) {
    const w = wallets[role];
    await optInRole(role, w.mnemonic, w.address, network);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
