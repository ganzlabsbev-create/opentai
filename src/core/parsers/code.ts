import { extractCodeMetadata } from "@/core/code";
import { basePreview, extOf, lineCount, type FileParser } from "@/core/parsers/types";

const CODE_EXTS = new Set(["js", "jsx", "ts", "tsx", "mjs", "cjs"]);

export const CodeParser: FileParser = {
  id: "code",
  kind: "code",
  canParse: (name) => CODE_EXTS.has(extOf(name)),
  parse: (text) => {
    const { imports, exports, functions } = extractCodeMetadata(text);
    return {
      kind: "code",
      text,
      preview: basePreview(text),
      metadata: {
        lines: lineCount(text),
        imports: imports.length,
        exports: exports.length,
        functions: functions.length,
      },
    };
  },
};
