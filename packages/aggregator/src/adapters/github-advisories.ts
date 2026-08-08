import { parseTimeToUnix, type RawCandidate } from "../candidate.js";
import type { SourceAdapter } from "./types.js";

export const githubAdvisoriesAdapter: SourceAdapter = {
  name: "github-advisories",
  async extract({ body, nowUnix }) {
    const data: unknown = JSON.parse(body);
    if (!Array.isArray(data)) return { candidates: [] };
    const candidates: RawCandidate[] = data.map((row) => {
      const adv = row as Record<string, unknown>;
      const vulns = (adv.vulnerabilities as unknown[]) ?? [];
      const eco =
        vulns[0] && typeof vulns[0] === "object"
          ? String(
              ((vulns[0] as { package?: { ecosystem?: string } }).package ?? {}).ecosystem ?? "",
            )
          : "";
      const hints = [String(adv.cve_id ?? ""), String(adv.severity ?? ""), eco].filter(Boolean);
      return {
        title: String(adv.summary ?? adv.ghsa_id ?? "advisory"),
        url: String(adv.html_url ?? ""),
        summary: String(adv.description ?? "").slice(0, 2000),
        published_at: parseTimeToUnix(String(adv.published_at ?? ""), nowUnix),
        external_id: String(adv.ghsa_id ?? ""),
        keywords_hint: hints,
        kind: "article" as const,
      };
    });
    return { candidates };
  },
};
