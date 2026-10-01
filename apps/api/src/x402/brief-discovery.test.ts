import { describe, expect, it } from "vitest";
import { validateDiscoveryExtension } from "@x402-avm/extensions";
import { briefRouteExtensions } from "./brief-discovery";

describe("briefRouteExtensions", () => {
  it("passes GoPlausible bazaar validation", () => {
    const result = validateDiscoveryExtension(briefRouteExtensions.bazaar);
    expect(result.valid).toBe(true);
  });
});
