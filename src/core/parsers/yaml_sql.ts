import { basePreview, extOf, lineCount, type FileParser } from "@/core/parsers/types";

export const YamlParser: FileParser = {
  id: "yaml",
  kind: "yaml",
  canParse: (name) => extOf(name) === "yaml" || extOf(name) === "yml",
  parse: (text) => {
    // Top-level keys: lines with no leading whitespace and a `key:` pattern.
    const topLevelKeys = (text.match(/^[A-Za-z0-9_-]+:/gm) ?? []).length;
    const listItems = (text.match(/^\s*-\s/gm) ?? []).length;
    return {
      kind: "yaml",
      text,
      preview: basePreview(text),
      metadata: { lines: lineCount(text), topLevelKeys, listItems },
    };
  },
};

export const SqlParser: FileParser = {
  id: "sql",
  kind: "sql",
  canParse: (name) => extOf(name) === "sql",
  parse: (text) => {
    const statements = text.split(";").map((s) => s.trim()).filter(Boolean).length;
    const tables = new Set(
      Array.from(text.matchAll(/\b(?:from|into|update|table)\s+["'`]?([a-zA-Z0-9_.]+)["'`]?/gi))
        .map((m) => m[1])
        .filter((t): t is string => !!t)
    );
    return {
      kind: "sql",
      text,
      preview: basePreview(text),
      metadata: { lines: lineCount(text), statements, tables: tables.size },
    };
  },
};
