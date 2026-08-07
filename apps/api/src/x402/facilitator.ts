import { HTTPFacilitatorClient } from "@x402/core/server";
import type { FacilitatorClient } from "@x402/core/server";
import {
  ALGORAND_MAINNET_FACILITATOR_CAIP2,
  ALGORAND_TESTNET_FACILITATOR_CAIP2,
} from "./networks";

/**
 * Snapshot of GoPlausible GET /supported (AVM kinds only).
 * Used when local workerd cannot reach the facilitator (common on some Mac/local setups).
 * Real verify/settle still require live facilitator connectivity.
 */
const LOCAL_SUPPORTED_SNAPSHOT = {
  kinds: [
    {
      x402Version: 2 as const,
      scheme: "exact",
      network: ALGORAND_TESTNET_FACILITATOR_CAIP2,
      extra: {
        feePayer: "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA",
      },
    },
    {
      x402Version: 2 as const,
      scheme: "exact",
      network: ALGORAND_MAINNET_FACILITATOR_CAIP2,
      extra: {
        feePayer: "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA",
      },
    },
  ],
  extensions: [] as unknown[],
  signers: {
    "algorand:*": ["ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA"],
  },
};

/**
 * Wraps HTTPFacilitatorClient. On Testnet (+ allowFallback), falls back to a
 * static /supported snapshot if outbound fetch fails so local unpaid 402 works.
 */
export function createFacilitatorClient(
  url: string,
  allowSupportedFallback: boolean,
): FacilitatorClient {
  const inner = new HTTPFacilitatorClient({ url });
  if (!allowSupportedFallback) return inner;

  return {
    getSupported: async () => {
      try {
        return await inner.getSupported();
      } catch (err) {
        console.warn(
          "facilitator /supported unreachable; using local snapshot for unpaid 402",
          err instanceof Error ? err.message : err,
        );
        return LOCAL_SUPPORTED_SNAPSHOT as Awaited<ReturnType<FacilitatorClient["getSupported"]>>;
      }
    },
    verify: (payload, requirements) => inner.verify(payload, requirements),
    settle: (payload, requirements) => inner.settle(payload, requirements),
  };
}
