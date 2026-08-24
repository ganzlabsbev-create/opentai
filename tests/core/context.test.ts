import { describe, expect, it } from "vitest";
import { assembleContext, estimateTokens } from "@/core/context";

describe("core/context", () => {
  it("estimates roughly 4 characters per token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("includes all files when comfortably within budget", () => {
    const result = assembleContext(
      [
        { id: "1", name: "a.txt", text: "hello" },
        { id: "2", name: "b.txt", text: "world" },
      ],
      [],
      5000
    );
    expect(result.includedFileIds).toEqual(["1", "2"]);
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("a.txt");
    expect(result.text).toContain("b.txt");
  });

  it("truncates and reports it when a file exceeds the budget", () => {
    const bigFile = { id: "big", name: "big.txt", text: "x".repeat(10_000) };
    const result = assembleContext([bigFile], [], 100);
    expect(result.includedFileIds).toEqual([]);
    expect(result.truncated).toBe(true);
  });

  it("includes search result snippets when they fit the budget", () => {
    const result = assembleContext([], [{ id: "1", name: "a.txt", score: 3, snippet: "some snippet" }], 5000);
    expect(result.text).toContain("some snippet");
  });
});
