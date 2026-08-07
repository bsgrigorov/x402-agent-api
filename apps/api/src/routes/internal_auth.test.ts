import { describe, expect, it } from "vitest";
import { bearerOk, timingSafeEqualStr } from "./internal_auth";

describe("internal_auth", () => {
  it("timingSafeEqualStr matches equal strings", () => {
    expect(timingSafeEqualStr("abc", "abc")).toBe(true);
    expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    expect(timingSafeEqualStr("abc", "ab")).toBe(false);
  });

  it("bearerOk rejects short tokens and bad headers", () => {
    const strong = "a".repeat(32);
    expect(bearerOk(`Bearer ${strong}`, strong)).toBe(true);
    expect(bearerOk(`Bearer ${strong}`, "short")).toBe(false);
    expect(bearerOk(`Bearer wrong${"a".repeat(27)}`, strong)).toBe(false);
    expect(bearerOk(undefined, strong)).toBe(false);
    expect(bearerOk(`Basic ${strong}`, strong)).toBe(false);
  });
});
