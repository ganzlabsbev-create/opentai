import { basePreview, extOf, lineCount, type FileParser } from "@/core/parsers/types";

export const TextParser: FileParser = {
  id: "text",
  kind: "txt",
  canParse: (name) => extOf(name) === "txt" || extOf(name) === "",
  parse: (text) => ({
    kind: "txt",
    text,
    preview: basePreview(text),
    metadata: { lines: lineCount(text), chars: text.length },
  }),
};

export const MarkdownParser: FileParser = {
  id: "markdown",
  kind: "md",
  canParse: (name) => extOf(name) === "md" || extOf(name) === "markdown",
  parse: (text) => {
    const headingCount = (text.match(/^#{1,6}\s/gm) ?? []).length;
    const codeBlockCount = (text.match(/^```/gm) ?? []).length / 2;
    return {
      kind: "md",
      text,
      preview: basePreview(text.replace(/^#+\s*/gm, "")),
      metadata: { lines: lineCount(text), headings: headingCount, codeBlocks: Math.floor(codeBlockCount) },
    };
  },
};
