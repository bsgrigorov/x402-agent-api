import { isTopicId, type SourceDef, type SourceKind } from "./types.js";

type RegistryFile = { sources: Array<Record<string, unknown>> };

function inferJob(s: {
  id: string;
  kind: SourceKind;
  expand?: "tldr-html";
}): SourceDef["job"] {
  if (s.expand === "tldr-html") return "tldr";
  if (
    (s.id.startsWith("yahoo-") && s.kind === "json-api") ||
    s.id.startsWith("coingecko-") ||
    s.id === "crypto-fng"
  ) {
    return "quotes";
  }
  return "feeds";
}

/** Parse allowlist JSON (Workers-safe; no filesystem). */
export function parseRegistryJson(raw: string | RegistryFile): SourceDef[] {
  const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as RegistryFile;
  const out: SourceDef[] = [];
  for (const s of data.sources ?? []) {
    const topic = String(s.topic ?? "");
    if (!isTopicId(topic)) continue;
    const kind = String(s.kind ?? "rss") as SourceKind;
    if (kind !== "rss" && kind !== "atom" && kind !== "json-api") continue;
    const expand = s.expand === "tldr-html" ? ("tldr-html" as const) : undefined;
    const def: SourceDef = {
      id: String(s.id),
      topic,
      kind,
      label: String(s.label ?? s.id),
      url: String(s.url),
      tier: String(s.tier ?? ""),
      headers: (s.headers as Record<string, string> | undefined) ?? undefined,
      expand,
      max_age_hours:
        typeof s.max_age_hours === "number" && Number.isFinite(s.max_age_hours)
          ? s.max_age_hours
          : undefined,
    };
    def.job = inferJob(def);
    out.push(def);
  }
  return out;
}
