import type { Context } from "hono";
import type { Env } from "../env";
import { FAVICON_PNG, FAVICON_SVG, OG_IMAGE_PNG } from "./site-assets";

const SITE = "https://x402.darkhold.dev";
const TITLE = "x402 Morning Brief";
const DESCRIPTION =
  "Pay-per-request multi-topic intel brief for agents. $0.05 USDC on Algorand Mainnet via x402 and GoPlausible.";
const GITHUB = "https://github.com/bsgrigorov/x402-agent-api";

/** JSON only when the client explicitly asks for it; HTML otherwise (browsers + link preview bots). */
export function wantsJsonResponse(accept: string | undefined): boolean {
  if (!accept) return false;
  const lower = accept.toLowerCase();
  if (lower.includes("text/html")) return false;
  if (lower.includes("application/json")) return true;
  return false;
}

const PREVIEW_BOT =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot/i;

export function isLinkPreviewBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return PREVIEW_BOT.test(userAgent);
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
  const ogImage = `${SITE}/og-image.png`;
  const ogImageAlt = escapeHtml("x402 Morning Brief — pay-per-request intel on Algorand");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#050508" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="x402 Morning Brief" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${ogImageAlt}" />
  <meta property="og:url" content="${SITE}/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="${ogImageAlt}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="apple-touch-icon" href="/favicon.ico" />
  <link rel="canonical" href="${SITE}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&amp;family=Orbitron:wght@500;700;900&amp;family=Share+Tech+Mono&amp;display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #050508;
      --panel: rgba(12, 16, 28, 0.85);
      --cyan: #00f3ff;
      --magenta: #ff2a6d;
      --violet: #9d4edd;
      --lime: #39ff14;
      --text: #f0f6fc;
      --muted: #a8b8cc;
      --border: rgba(0, 243, 255, 0.35);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      color: var(--text);
      background: var(--bg);
      line-height: 1.6;
      font-size: 1.0625rem;
      overflow-x: hidden;
    }
    .bg {
      position: fixed; inset: 0; z-index: -2;
      background:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(157, 78, 221, 0.35), transparent),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(255, 42, 109, 0.15), transparent),
        radial-gradient(ellipse 50% 40% at 0% 80%, rgba(0, 243, 255, 0.12), transparent),
        var(--bg);
    }
    .grid {
      position: fixed; inset: 0; z-index: -1; opacity: 0.14;
      background-image:
        linear-gradient(rgba(0, 243, 255, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 243, 255, 0.08) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: linear-gradient(to bottom, black 30%, transparent 95%);
    }
    .scanlines {
      position: fixed; inset: 0; z-index: 9999; pointer-events: none; opacity: 0.025;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px);
    }
    .wrap { max-width: 52rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .badge {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 0.35rem 0.65rem; border: 1px solid var(--border);
      color: var(--cyan); background: rgba(0, 243, 255, 0.06);
      box-shadow: 0 0 12px rgba(0, 243, 255, 0.15);
    }
    .badge.magenta { color: var(--magenta); border-color: rgba(255, 42, 109, 0.5); background: rgba(255, 42, 109, 0.08); }
    h1 {
      font-family: Orbitron, sans-serif;
      font-size: clamp(2rem, 6vw, 3.25rem);
      font-weight: 900;
      margin: 0 0 0.5rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      position: relative;
      text-shadow: 0 0 16px rgba(0, 243, 255, 0.35), 0 0 32px rgba(157, 78, 221, 0.2);
    }
    h1 .accent { color: var(--cyan); }
    h1 .dim { color: #ff6b9d; font-weight: 700; }
    .hero-copy {
      max-width: 42rem;
      margin: 0.75rem 0 2rem;
    }
    .hero-headline {
      margin: 0;
      font-size: clamp(1.2rem, 2.8vw, 1.45rem);
      font-weight: 500;
      line-height: 1.5;
      letter-spacing: 0.01em;
      color: #f7fafc;
    }
    .hero-headline em {
      font-style: normal;
      font-weight: 600;
      background: linear-gradient(90deg, #e8f4ff 0%, #a5f3fc 45%, #f0abfc 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .hero-sub {
      margin: 1rem 0 0;
      font-size: 1.08rem;
      line-height: 1.65;
      color: #c5d4e6;
    }
    .hero-sub code {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      font-size: 0.95em;
      color: var(--cyan);
    }
    .hero-sub .amt {
      font-family: Orbitron, sans-serif;
      font-weight: 700;
      color: var(--lime);
      text-shadow: 0 0 10px rgba(57, 255, 20, 0.25);
    }
    .cards {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.75rem; margin-bottom: 2rem;
    }
    .card {
      display: block; text-decoration: none; color: inherit;
      padding: 1rem 1.1rem; border: 1px solid var(--border);
      background: var(--panel); backdrop-filter: blur(8px);
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
    }
    .card:hover {
      border-color: var(--magenta);
      box-shadow: 0 0 20px rgba(255, 42, 109, 0.25);
      transform: translateY(-2px);
    }
    .card kbd {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      color: var(--cyan); font-size: 0.8rem;
    }
    .card .title { display: block; margin-top: 0.4rem; font-size: 1rem; font-weight: 600; color: var(--text); }
    .card .label { display: block; margin-top: 0.25rem; font-size: 0.875rem; color: var(--muted); }
    .terminal {
      border: 1px solid rgba(157, 78, 221, 0.45);
      background: rgba(0, 0, 0, 0.55);
      padding: 1rem 1.15rem; margin-bottom: 1.5rem;
      box-shadow: inset 0 0 30px rgba(157, 78, 221, 0.08);
    }
    .terminal .bar {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      font-size: 0.72rem; letter-spacing: 0.12em; color: #c4a8e8;
      margin-bottom: 0.75rem; text-transform: uppercase;
    }
    .terminal pre {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      margin: 0; font-size: 0.875rem; line-height: 1.55; color: #dce8f5;
      white-space: pre-wrap; word-break: break-all;
    }
    .terminal .prompt { color: var(--lime); }
    .foot { font-size: 0.875rem; color: var(--muted); line-height: 1.5; }
    .foot code {
      font-family: "Share Tech Mono", ui-monospace, monospace;
      font-size: 0.85rem; color: var(--cyan);
    }
    @media (prefers-reduced-motion: no-preference) {
      h1 { animation: pulse-glow 4s ease-in-out infinite; }
    }
    @keyframes pulse-glow {
      0%, 100% { text-shadow: 0 0 20px rgba(0, 243, 255, 0.45), 0 0 40px rgba(157, 78, 221, 0.25); }
      50% { text-shadow: 0 0 28px rgba(0, 243, 255, 0.65), 0 0 50px rgba(255, 42, 109, 0.2); }
    }
  </style>
</head>
<body>
  <div class="bg" aria-hidden="true"></div>
  <div class="grid" aria-hidden="true"></div>
  <div class="scanlines" aria-hidden="true"></div>
  <main class="wrap">
    <div class="badge-row">
      <span class="badge">Algorand Mainnet</span>
      <span class="badge">GoPlausible</span>
      <span class="badge magenta">x402-global-challenge</span>
    </div>
    <h1><span class="accent">x402</span> <span class="dim">Morning</span> Brief</h1>
    <div class="hero-copy">
      <p class="hero-headline"><em>Multi-topic intel brief</em> for agents and builders.<br />One HTTPS call. No subscriptions.</p>
      <p class="hero-sub"><code>POST /v1/brief</code> · <span class="amt">$0.05 USDC</span> per request · Exact AVM settle</p>
    </div>
    <div class="cards">
      <a class="card" href="${SITE}/health"><kbd>GET</kbd><span class="title">/health</span><span class="label">Liveness check</span></a>
      <a class="card" href="${GITHUB}"><kbd>SRC</kbd><span class="title">GitHub</span><span class="label">x402-agent-api</span></a>
      <a class="card" href="${SITE}/llms.txt"><kbd>GET</kbd><span class="title">llms.txt</span><span class="label">Agent discovery</span></a>
      <a class="card" href="${SITE}/.well-known/x402.json"><kbd>GET</kbd><span class="title">x402.json</span><span class="label">Well-known manifest</span></a>
      <a class="card" href="https://facilitator.goplausible.xyz/dashboard/leaderboards?cat=merchants&amp;env=mainnet"><kbd>DATA</kbd><span class="title">Leaderboard</span><span class="label">GoPlausible merchants</span></a>
      <a class="card" href="https://facilitator.goplausible.xyz/discovery/resources?env=mainnet"><kbd>BAZAAR</kbd><span class="title">Catalog</span><span class="label">Paid resources</span></a>
    </div>
    <div class="terminal">
      <div class="bar">// unpaid probe → 402 payment required</div>
      <pre><span class="prompt">$</span> curl -s -X POST ${SITE}/v1/brief \\
  -H 'content-type: application/json' \\
  -d '{"keywords":["ai"],"topics":["tech"]}'</pre>
    </div>
    <p class="foot">Machine JSON at this URL: <code>Accept: application/json</code></p>
  </main>
</body>
</html>`;
}

export const OG_IMAGE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="x402 Morning Brief">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050508"/>
      <stop offset="50%" stop-color="#120a1f"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00f3ff"/>
      <stop offset="50%" stop-color="#9d4edd"/>
      <stop offset="100%" stop-color="#ff2a6d"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g stroke="rgba(0,243,255,0.12)" stroke-width="1">
    <path d="M0 120 H1200 M0 240 H1200 M0 360 H1200 M0 480 H1200"/>
    <path d="M120 0 V630 M360 0 V630 M600 0 V630 M840 0 V630 M1080 0 V630"/>
  </g>
  <rect x="60" y="60" width="1080" height="510" fill="none" stroke="url(#neon)" stroke-width="2" opacity="0.6"/>
  <text x="100" y="280" fill="#00f3ff" font-family="monospace" font-size="72" font-weight="700" filter="url(#glow)">x402</text>
  <text x="100" y="360" fill="#e8f4ff" font-family="monospace" font-size="48" font-weight="700">MORNING BRIEF</text>
  <text x="100" y="430" fill="#7a8ca3" font-family="monospace" font-size="28">$0.05 USDC · Algorand · GoPlausible</text>
  <text x="100" y="480" fill="#ff2a6d" font-family="monospace" font-size="22">x402.darkhold.dev</text>
</svg>`;

export function handleRoot(c: Context<{ Bindings: Env }>) {
  const accept = c.req.header("Accept");
  const ua = c.req.header("User-Agent");
  const json =
    wantsJsonResponse(accept) && !isLinkPreviewBot(ua);
  if (json) {
    return c.json(rootJson(), 200, { Vary: "Accept" });
  }
  return c.html(rootHtml(), 200, { Vary: "Accept" });
}

export function handleOgImage(c: Context<{ Bindings: Env }>) {
  return c.body(OG_IMAGE_SVG, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
  });
}

export function handleFaviconSvg(c: Context<{ Bindings: Env }>) {
  return c.body(FAVICON_SVG, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=604800, immutable",
  });
}

export function handleFaviconIco(c: Context<{ Bindings: Env }>) {
  return c.body(FAVICON_PNG, 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=604800, immutable",
  });
}

export function handleOgImagePng(c: Context<{ Bindings: Env }>) {
  return c.body(OG_IMAGE_PNG, 200, {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
  });
}
