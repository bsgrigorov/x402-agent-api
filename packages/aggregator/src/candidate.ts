/** Extracted-but-not-yet-gated item. Adapters emit these; aggregate/gate consumes them. */

import type { ItemKind } from "./types.js";

export type RawCandidate = {
  url: string;
  title: string;
  summary?: string;
  published_at?: number | null;
  external_id?: string;
  keywords_hint?: string[];
  kind?: ItemKind;
  payload?: Record<string, unknown>;
};

export function parseTimeToUnix(raw: string | number | null | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
  }
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : fallback;
}
