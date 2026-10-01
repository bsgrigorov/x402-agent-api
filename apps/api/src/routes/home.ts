import type { Context } from "hono";
import type { Env } from "../env";

const SITE = "https://x402.darkhold.dev";
const TITLE = "x402 Morning Brief";
const DESCRIPTION =
  "Pay-per-request multi-topic intel brief for agents. $0.05 USDC on Algorand Mainnet via x402 and GoPlausible.";
const GITHUB = "https://github.com/bsgrigorov/x402-agent-api";

export function wantsJsonResponse(accept: string | undefined): boolean {
  if (!accept) return true;
  const lower = accept.toLowerCase();
  if (lower.includes("text/html")) return false;
  if (lower.includes("application/json")) return true;
  return true;
}

export function rootJson() {
  return {
    name: "x402-morning-brief",
    product: "morning-brief",
    endpoints: {
      health: "GET /health",
      brief: "POST /v1/brief (x402)",
      ingest: "POST /internal/ingest (bearer)",
    },
    links: {
      github: GITHUB,
      llms: `${SITE}/llms.txt`,
      x402: `${SITE}/.well-known/x402.json`,
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rootHtml(): string {
  const title = escapeHtml(TITLE);
  const desc = escapeHtml(DESCRIPTION);
  const ogImage = `${SITE}/og-image.svg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta property="og:site_name" content="x402 Morning Brief" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${SITE}/" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${SITE}/" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #0f172a; }
    h1 { font-size: 1.5rem; }
    code { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px; }
    a { color: #0369a1; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${desc}</p>
  <p>Flagship paid route: <code>POST /v1/brief</code> — $0.05 USDC, challenge tag <code>x402-global-challenge</code>.</p>
  <ul>
    <li><a href="${GITHUB}">Source (GitHub)</a></li>
    <li><a href="${SITE}/llms.txt">llms.txt</a></li>
    <li><a href="${SITE}/.well-known/x402.json">.well-known/x402.json</a></li>
    <li><a href="${SITE}/health">Health</a></li>
    <li><a href="https://facilitator.goplausible.xyz/dashboard/leaderboards?cat=merchants&amp;env=mainnet">GoPlausible leaderboard</a></li>
  </ul>
  <p>API discovery JSON: send <code>Accept: application/json</code> to this URL.</p>
</body>
</html>`;
}

export const OG_IMAGE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="x402 Morning Brief">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="80" y="280" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="64" font-weight="700">x402 Morning Brief</text>
  <text x="80" y="360" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="32">Paid intel brief · Algorand Mainnet · GoPlausible</text>
  <text x="80" y="420" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="24">x402.darkhold.dev</text>
</svg>`;

export function handleRoot(c: Context<{ Bindings: Env }>) {
  if (wantsJsonResponse(c.req.header("Accept"))) {
    return c.json(rootJson());
  }
  return c.html(rootHtml());
}

export function handleOgImage(c: Context<{ Bindings: Env }>) {
  return c.body(OG_IMAGE_SVG, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
  });
}
