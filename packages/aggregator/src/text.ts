/** Plain-text guards for untrusted feed HTML. */

const TAG_RE = /<[^>]+>/g;
const WS_RE = /\s+/g;
const CTRL_RE = /[\u0000-\u001f\u007f]/g;

function fromCodePointSafe(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return " ";
  try {
    return String.fromCodePoint(code);
  } catch {
    return " ";
  }
}

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(TAG_RE, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => fromCodePointSafe(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => fromCodePointSafe(Number(n)));
}

export function sanitizeText(input: string, max: number): string {
  return stripHtml(input).replace(CTRL_RE, " ").replace(WS_RE, " ").trim().slice(0, max);
}
