import { basePreview, extOf, lineCount, type FileParser } from "@/core/parsers/types";

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export const HtmlParser: FileParser = {
  id: "html",
  kind: "html",
  canParse: (name) => extOf(name) === "html" || extOf(name) === "htm",
  parse: (text) => {
    const tagCount = (text.match(/<[a-zA-Z][^>]*>/g) ?? []).length;
    return {
      kind: "html",
      text,
      preview: basePreview(stripTags(text)),
      metadata: { lines: lineCount(text), tags: tagCount },
    };
  },
};

export const CssParser: FileParser = {
  id: "css",
  kind: "css",
  canParse: (name) => extOf(name) === "css",
  parse: (text) => {
    const ruleCount = (text.match(/\{[^}]*\}/g) ?? []).length;
    return {
      kind: "css",
      text,
      preview: basePreview(text),
      metadata: { lines: lineCount(text), rules: ruleCount },
    };
  },
};

export const XmlParser: FileParser = {
  id: "xml",
  kind: "xml",
  canParse: (name) => extOf(name) === "xml",
  parse: (text) => {
    const tagCount = (text.match(/<[a-zA-Z][^>]*>/g) ?? []).length;
    return {
      kind: "xml",
      text,
      preview: basePreview(stripTags(text)),
      metadata: { lines: lineCount(text), tags: tagCount },
    };
  },
};
