import { describe, expect, it } from "vitest";
import type { FeedItem } from "@x402-agent-api/shared";
import { filterAndRank } from "./filter";

const base: FeedItem = {
  id: "a",
  url: "https://example.com/a",
  title: "Kubernetes CVE patch",
  summary: "Cluster admins should upgrade",
  source: "demo",
  topic: "tech",
  kind: "article",
  published_at: 1_700_000_000,
  ingested_at: 1_700_000_100,
  external_id: "",
  keywords_hint: ["kubernetes"],
  payload: "{}",
};

describe("filterAndRank", () => {
  it("keeps keyword hits and prefers higher scores", () => {
    const other: FeedItem = {
      ...base,
      id: "b",
      url: "https://example.com/b",
      title: "Unrelated sports score",
      summary: "game",
      keywords_hint: [],
      published_at: 1_700_000_999,
    };
    const out = filterAndRank([other, base], ["kubernetes"], 5);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });
});
