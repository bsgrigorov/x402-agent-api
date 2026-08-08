-- Replay lock: one payment payload (header hash) → one fulfill.
-- Settle runs after the handler in @x402/hono, so we key on the
-- payment-signature / x-payment header, not the settle tx id.
CREATE TABLE payment_claims (
  payment_key TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX payment_claims_created ON payment_claims (created_at DESC);
