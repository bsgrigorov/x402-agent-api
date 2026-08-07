import type { BriefRequest, BriefResponse, SectionId } from "@x402-agent-api/shared";
import { assembleExtractive } from "./assemble";
import { filterAndRank } from "./filter";
import { newestIngestedAt, querySectionCandidates } from "../store/items";

/**
 * Morning-brief product entrypoint — no HTTP, no x402.
 * Default path is extractive; synthesize stays gated off until metering + budget exist.
 */
export async function buildBrief(
  db: D1Database,
  req: BriefRequest,
  priceUsdc: number,
): Promise<BriefResponse> {
  if (req.synthesize) {
    throw new Error("synthesize is disabled until metering + LLM budget are live");
  }

  const max = Math.min(Math.max(req.max_items_per_section ?? 5, 1), 20);
  const bySection = new Map<SectionId, ReturnType<typeof filterAndRank>>();

  for (const section of req.sections) {
    const candidates = await querySectionCandidates(db, section);
    bySection.set(section, filterAndRank(candidates, req.keywords, max));
  }

  const newest = await newestIngestedAt(db);
  const storeAgeS =
    newest == null ? null : Math.max(0, Math.floor(Date.now() / 1000) - newest);

  return assembleExtractive({ bySection, priceUsdc, storeAgeS });
}
