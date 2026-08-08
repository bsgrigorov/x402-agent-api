import { ITEM_RETENTION_S } from "@x402-agent-api/shared";
import type { Env } from "../env";

/** Hard-delete items past retention. Ledger tables are never cleaned here. */
export async function cleanupOldItems(env: Env): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - ITEM_RETENTION_S;
  const result = await env.DB.prepare(`DELETE FROM items WHERE published_at < ?`)
    .bind(cutoff)
    .run();
  return result.meta.changes ?? 0;
}
