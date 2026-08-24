import { describe, expect, it } from "vitest";
import { isSupportedFile, parseFile, pickParser } from "@/core/parsers";
import { extractCodeMetadata } from "@/core/code";

describe("core/parsers", () => {
  it("parses JSON and counts keys", () => {
    const result = parseFile("data.json", JSON.stringify({ a: 1, b: { c: 2 } }));
    expect(result.kind).toBe("json");
    expect(result.metadata.keys).toBe(3);
  });

  it("throws PARSE_FAILED for invalid JSON", () => {
    expect(() => parseFile("bad.json", "{not valid json")).toThrow();
  });

  it("parses CSV rows and columns", () => {
    const result = parseFile("data.csv", "name,age\nAnn,30\nBob,25");
    expect(result.kind).toBe("csv");
    expect(result.metadata.rows).toBe(2);
    expect(result.metadata.columns).toBe(2);
  });

  it("parses code files and counts imports", () => {
    const result = parseFile("index.ts", 'import { useState } from "react";\nexport function App() {}');
    expect(result.kind).toBe("code");
    expect(result.metadata.imports).toBe(1);
  });

  it("falls back to the text parser for unknown/empty extensions", () => {
    const parser = pickParser("README");
    expect(parser.id).toBe("text");
  });

  it("rejects genuinely unsupported extensions", () => {
    expect(() => pickParser("archive.zip")).toThrow();
    expect(isSupportedFile("archive.zip")).toBe(false);
  });

  it("recognizes all documented extensions as supported", () => {
    for (const name of ["a.txt", "a.md", "a.json", "a.csv", "a.html", "a.css", "a.js", "a.ts", "a.xml", "a.yaml", "a.sql"]) {
      expect(isSupportedFile(name)).toBe(true);
    }
  });
});

describe("core/code import extraction", () => {
  it("extracts named and default exports plus function names", () => {
    const { imports, exports, functions } = extractCodeMetadata(
      `import React from "react";\nexport function Widget() {}\nexport default Widget;\nconst helper = () => {};`
    );
    expect(imports).toContain("react");
    expect(exports).toContain("Widget");
    expect(functions).toContain("Widget");
    expect(functions).toContain("helper");
  });
});
