import { describe, expect, it } from "vitest";
import { wantsJsonResponse } from "./home";

describe("wantsJsonResponse", () => {
  it("serves HTML to browsers", () => {
    expect(wantsJsonResponse("text/html,application/xhtml+xml")).toBe(false);
  });

  it("serves JSON to explicit JSON clients", () => {
    expect(wantsJsonResponse("application/json")).toBe(true);
  });

  it("defaults to JSON for curl */*", () => {
    expect(wantsJsonResponse("*/*")).toBe(true);
  });
});
