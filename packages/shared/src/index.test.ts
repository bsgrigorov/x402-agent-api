import { describe, expect, it } from "vitest";
import { sanitizeFeedText, isTopicId } from "./index";

describe("sanitizeFeedText", () => {
  it("strips controls and caps", () => {
    expect(sanitizeFeedText("a\u0000b".repeat(300), 10).length).toBe(10);
  });
});

describe("isTopicId", () => {
  it("accepts known topics", () => {
    expect(isTopicId("tech")).toBe(true);
    expect(isTopicId("markets")).toBe(true);
    expect(isTopicId("infra")).toBe(true);
    expect(isTopicId("sports")).toBe(false);
    expect(isTopicId("nope")).toBe(false);
  });
});
