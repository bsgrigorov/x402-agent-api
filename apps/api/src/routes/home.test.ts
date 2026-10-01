import { describe, expect, it } from "vitest";
import { isLinkPreviewBot, rootHtml, wantsJsonResponse } from "./home";

describe("wantsJsonResponse", () => {
  it("serves HTML to browsers", () => {
    expect(wantsJsonResponse("text/html,application/xhtml+xml")).toBe(false);
  });

  it("serves JSON to explicit JSON clients", () => {
    expect(wantsJsonResponse("application/json")).toBe(true);
  });

  it("serves HTML for curl */* (link preview bots use this)", () => {
    expect(wantsJsonResponse("*/*")).toBe(false);
  });

  it("serves HTML when Accept is omitted", () => {
    expect(wantsJsonResponse(undefined)).toBe(false);
  });
});

describe("isLinkPreviewBot", () => {
  it("detects common unfurl user agents", () => {
    expect(isLinkPreviewBot("facebookexternalhit/1.1")).toBe(true);
    expect(isLinkPreviewBot("Twitterbot/1.0")).toBe(true);
    expect(isLinkPreviewBot("curl/8.0")).toBe(false);
  });
});

describe("rootHtml", () => {
  it("includes favicon and PNG social image tags", () => {
    const html = rootHtml();
    expect(html).toContain('rel="icon" href="/favicon.svg"');
    expect(html).toContain("/og-image.png");
    expect(html).toContain('property="og:image:type" content="image/png"');
    expect(html).toContain('name="twitter:image"');
  });
});
