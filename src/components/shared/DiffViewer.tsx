import { Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DiffLine } from "@/types/project";

interface DiffViewerProps {
  fileName: string;
  diff: DiffLine[];
  onApply: () => void;
  onReject: () => void;
}

const lineClasses: Record<DiffLine["type"], string> = {
  add: "bg-accent-soft text-accent",
  del: "bg-danger-soft text-danger",
  ctx: "bg-transparent text-text",
};

export function DiffViewer({ fileName, diff, onApply, onReject }: DiffViewerProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="font-mono text-xs text-text-muted">{fileName}</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" icon={Undo2} onClick={onReject}>
            ปฏิเสธ
          </Button>
          <Button size="sm" variant="accent" icon={Check} onClick={onApply}>
            ใช้
          </Button>
        </div>
      </div>
      <div className="font-mono text-[12.5px]">
        {diff.map((l, i) => (
          <div key={i} className={`whitespace-pre px-3 py-0.5 ${lineClasses[l.type]}`}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
