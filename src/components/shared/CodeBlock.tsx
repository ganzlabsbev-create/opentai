"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border bg-surface-sunk">
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
        <span className="font-mono text-[11px] text-text-muted">{lang || "text"}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 border-0 bg-transparent text-[11px] text-text-muted">
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-3">
        <code className="whitespace-pre font-mono text-[12.5px] text-text">{code}</code>
      </pre>
    </div>
  );
}
