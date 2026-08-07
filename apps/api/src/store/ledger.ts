export type RevenueEvent = {
  id: string;
  request_id: string;
  sku: string;
  price_usdc: number;
  payer: string | null;
  tx_id: string | null;
  network: string;
  settled_at: number;
};

export type CostEvent = {
  id: string;
  request_id: string;
  kind: string;
  provider: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number;
  skip_reason: string | null;
  created_at: number;
};

export async function appendRevenue(db: D1Database, event: RevenueEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO revenue_events
       (id, request_id, sku, price_usdc, payer, tx_id, network, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.request_id,
      event.sku,
      event.price_usdc,
      event.payer,
      event.tx_id,
      event.network,
      event.settled_at,
    )
    .run();
}

export async function appendCost(db: D1Database, event: CostEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cost_events
       (id, request_id, kind, provider, model, tokens_in, tokens_out, cost_usd, skip_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.request_id,
      event.kind,
      event.provider,
      event.model,
      event.tokens_in,
      event.tokens_out,
      event.cost_usd,
      event.skip_reason,
      event.created_at,
    )
    .run();
}
