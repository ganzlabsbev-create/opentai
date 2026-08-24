import { describe, expect, it } from "vitest";
import { diffLines } from "@/core/diff";

describe("core/diff", () => {
  it("returns all context lines when text is unchanged", () => {
    const text = "a\nb\nc";
    const diff = diffLines(text, text);
    expect(diff.every((l) => l.type === "ctx")).toBe(true);
    expect(diff).toHaveLength(3);
  });

  it("detects a single line addition", () => {
    const diff = diffLines("a\nb", "a\nb\nc");
    expect(diff.filter((l) => l.type === "add")).toHaveLength(1);
    expect(diff.find((l) => l.type === "add")?.text).toBe("+ c");
  });

  it("detects a single line deletion", () => {
    const diff = diffLines("a\nb\nc", "a\nc");
    expect(diff.filter((l) => l.type === "del")).toHaveLength(1);
    expect(diff.find((l) => l.type === "del")?.text).toBe("- b");
  });

  it("detects a replaced line as a del+add pair", () => {
    const diff = diffLines("hello world", "hello there");
    const types = diff.map((l) => l.type);
    expect(types).toContain("del");
    expect(types).toContain("add");
  });

  it("handles empty-to-nonempty text", () => {
    const diff = diffLines("", "one\ntwo");
    expect(diff.filter((l) => l.type === "add").length).toBeGreaterThan(0);
  });
});
