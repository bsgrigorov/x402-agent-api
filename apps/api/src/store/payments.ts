/** Claim a payment payload hash. Returns false if already used (replay). */
export async function claimPaymentKey(
  db: D1Database,
  paymentKey: string,
  requestId: string,
): Promise<boolean> {
  try {
    await db
      .prepare(
        `INSERT INTO payment_claims (payment_key, request_id, created_at)
         VALUES (?, ?, ?)`,
      )
      .bind(paymentKey, requestId, Math.floor(Date.now() / 1000))
      .run();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIQUE|constraint/i.test(msg)) return false;
    throw err;
  }
}
