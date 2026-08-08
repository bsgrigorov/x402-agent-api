import type { FeedItem, ItemKind, TopicId } from "@x402-agent-api/shared";
export type { ItemKind, TopicId } from "@x402-agent-api/shared";
export { TOPIC_FRESHNESS_S, isTopicId } from "@x402-agent-api/shared";

/** Alias — gate output matches D1 FeedItem row shape. */
export type NormalizedItem = FeedItem;

export type SourceKind = "rss" | "atom" | "json-api";

export type SourceDef = {
  id: string;
  topic: TopicId;
  kind: SourceKind;
  label: string;
  url: string;
  tier: string;
  headers?: Record<string, string>;
  expand?: "tldr-html";
  max_age_hours?: number;
  /** Cron job bucket */
  job?: "quotes" | "feeds" | "tldr";
};

export const TITLE_MAX = 300;
export const SUMMARY_MAX = 500;
export const DEFAULT_PER_FEED_CAP = 40;
