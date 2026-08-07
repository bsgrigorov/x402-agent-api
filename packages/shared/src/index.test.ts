import { describe, expect, it } from "vitest";
import { sanitizeFeedText, isSectionId } from "./index";

describe("sanitizeFeedText", () => {
  it("strips control chars and caps length", () => {
    expect(sanitizeFeedText("hi\nthere\x00", 8)).toBe("hi there");
  });
});

describe("isSectionId", () => {
  it("accepts known sections", () => {
    expect(isSectionId("tech")).toBe(true);
    expect(isSectionId("nope")).toBe(false);
  });
});
