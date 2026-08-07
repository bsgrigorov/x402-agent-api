import type { SectionId } from "@x402-agent-api/shared";

export type FeedDef = {
  id: string;
  section: SectionId;
  url: string;
  /** Human label for meta / debugging */
  label: string;
};

/**
 * Service-owned allowlist. Public RSS only; expand carefully (ToS).
 * Port patterns from KB morning-brief — do not mount the KB at runtime.
 */
export const FEED_ALLOWLIST: readonly FeedDef[] = [
  {
    id: "hn-frontpage",
    section: "tech",
    url: "https://hnrss.org/frontpage",
    label: "Hacker News",
  },
  {
    id: "bleepingcomputer",
    section: "security",
    url: "https://www.bleepingcomputer.com/feed/",
    label: "BleepingComputer",
  },
  {
    id: "coindesk",
    section: "crypto",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    label: "CoinDesk",
  },
] as const;

export function feedsForSection(section: SectionId): FeedDef[] {
  return FEED_ALLOWLIST.filter((f) => f.section === section);
}
