export type Env = {
  DB: D1Database;
  NETWORK: "ALGORAND_Testnet_CAIP2" | "ALGORAND_Mainnet_CAIP2";
  FACILITATOR_URL: string;
  BRIEF_PRICE_USDC: string;
  /** Merchant Algorand address (payTo). Set via wrangler secret / .dev.vars */
  PAY_TO: string;
  /** Bearer token for POST /internal/ingest (hydrate). Live cron uses ingest Worker. */
  INGEST_TOKEN: string;
  /**
   * Optional Testnet-only unpaid bypass header value (`x-dev-bypass`).
   * Must be unset / empty on Mainnet prod.
   */
  DEV_BYPASS_SECRET?: string;
};
