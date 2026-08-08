/** Constant-time string compare (Workers have no crypto.timingSafeEqual). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Bearer check; rejects tokens shorter than 32 chars. */
export function bearerOk(header: string | undefined, token: string): boolean {
  if (!token || token.length < 32) return false;
  if (!header) return false;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return false;
  return timingSafeEqualStr(value, token);
}
