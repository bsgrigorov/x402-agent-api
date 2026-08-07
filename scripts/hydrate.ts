#!/usr/bin/env tsx
/**
 * Local hydrate helper — POSTs items to /internal/ingest.
 *
 * Usage:
 *   INGEST_TOKEN=... BASE_URL=http://127.0.0.1:8787 pnpm hydrate -- --file ./seed.json
 */
import { readFileSync } from "node:fs";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const file = argValue("--file");
  if (!file) {
    console.error("Usage: pnpm hydrate -- --file ./seed.json");
    process.exit(1);
  }
  const token = process.env.INGEST_TOKEN;
  const base = process.env.BASE_URL ?? "http://127.0.0.1:8787";
  if (!token) {
    console.error("INGEST_TOKEN required");
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const res = await fetch(`${base}/internal/ingest`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  console.log(res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
