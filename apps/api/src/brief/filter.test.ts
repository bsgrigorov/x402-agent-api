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
  it("ranks keyword hits first, then backfills with freshest others", () => {
    const other: FeedItem = {
      ...base,
      id: "b",
      url: "https://example.com/b",
      title: "Unrelated infra note",
      summary: "networking",
      keywords_hint: [],
      published_at: 1_700_000_999,
    };
    const out = filterAndRank([other, base], ["kubernetes"], 5);
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe("a");
    expect(out[1]?.id).toBe("b");
  });

  it("with no keywords returns newest first", () => {
    const older: FeedItem = { ...base, id: "old", published_at: 100 };
    const newer: FeedItem = {
      ...base,
      id: "new",
      url: "https://example.com/new",
      published_at: 200,
    };
    const out = filterAndRank([older, newer], [], 2);
    expect(out.map((i) => i.id)).toEqual(["new", "old"]);
  });
});
