import type { TopicId } from "@x402-agent-api/shared";
import { parseRegistryJson, type SourceDef } from "@x402-agent-api/aggregator";
import wave1 from "../sources.wave1.json";

/** Wave 1 allowlist — same registry as source-analysis. */
export const WAVE1_SOURCES: readonly SourceDef[] = parseRegistryJson(
  wave1 as { sources: Array<Record<string, unknown>> },
);

/** @deprecated use WAVE1_SOURCES */
export const FEED_ALLOWLIST = WAVE1_SOURCES;

export type FeedDef = SourceDef;

export function feedsForTopic(topic: TopicId): SourceDef[] {
  return WAVE1_SOURCES.filter((f) => f.topic === topic);
}

export function feedsForJob(job: NonNullable<SourceDef["job"]>): SourceDef[] {
  return WAVE1_SOURCES.filter((f) => f.job === job);
}
