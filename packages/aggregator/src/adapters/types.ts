/** Source adapter contract — extract only; never gate/dedupe/store. */

import type { RawCandidate } from "../candidate.js";
import type { SourceDef } from "../types.js";

export type ExtractOptions = {
  /** Expand TLDR edition HTML (default true for tldr adapter). */
  tldrExpand?: boolean;
  tldrEditions?: number;
  keepEditionIndex?: boolean;
  sleepMs?: number;
  /** Optional dir to dump fetched edition HTML samples. */
  sampleDir?: string;
};

export type ExtractContext = {
  source: SourceDef;
  body: string;
  nowUnix: number;
  options?: ExtractOptions;
};

export type ExtractResult = {
  candidates: RawCandidate[];
  /** Free-form note for run.json (expand counts, etc.). */
  note?: string;
};

export type SourceAdapter = {
  /** Stable adapter name (not the feed id). */
  name: string;
  extract(ctx: ExtractContext): Promise<ExtractResult>;
};
