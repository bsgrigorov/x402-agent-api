/** Public surface for Workers cron + hydrate. */

export type { RawCandidate } from "./candidate.js";
export { parseTimeToUnix } from "./candidate.js";
export type { SourceDef, SourceKind, NormalizedItem, ItemKind, TopicId } from "./types.js";
export { TOPIC_FRESHNESS_S, isTopicId, DEFAULT_PER_FEED_CAP } from "./types.js";
export { parseRegistryJson } from "./registry.js";
export { gateCandidates, type GateDrop, type GateResult } from "./gate.js";
export {
  resolveAdapter,
  registeredAdapterIds,
  type SourceAdapter,
  type ExtractContext,
  type ExtractResult,
  type ExtractOptions,
} from "./adapters/index.js";
