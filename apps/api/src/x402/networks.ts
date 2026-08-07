import {
  ALGORAND_MAINNET_GENESIS_HASH,
  ALGORAND_TESTNET_GENESIS_HASH,
} from "@x402/avm";

/**
 * GoPlausible `/supported` advertises the full genesis-hash CAIP-2 form.
 * `@x402/avm` exports the truncated CAIP-2 (first 32 chars). Use the full form
 * in PaymentOption.network so facilitator kind lookup succeeds.
 */
export const ALGORAND_TESTNET_FACILITATOR_CAIP2 =
  `algorand:${ALGORAND_TESTNET_GENESIS_HASH}` as const;
export const ALGORAND_MAINNET_FACILITATOR_CAIP2 =
  `algorand:${ALGORAND_MAINNET_GENESIS_HASH}` as const;
