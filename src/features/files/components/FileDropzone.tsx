"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useFiles } from "@/features/files/store/FilesProvider";

interface FileDropzoneProps {
  projectId?: string | null;
}

export function FileDropzone({ projectId = null }: FileDropzoneProps) {
  const { addFiles } = useFiles();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, projectId);
      }}
      className={`mb-4 rounded-2xl border-[1.5px] border-dashed px-4.5 py-4.5 text-center ${
        dragOver ? "border-accent bg-accent-soft" : "border-border bg-transparent"
      }`}
    >
      <UploadCloud size={18} className="mx-auto mb-1.5 text-text-muted" />
      <div className="text-[13px] text-text">
        ลากไฟล์มาวาง หรือ{" "}
        <button onClick={() => inputRef.current?.click()} className="border-0 bg-none p-0 font-semibold text-accent">
          เลือกไฟล์
        </button>
      </div>
      <div className="mt-1 text-[11px] text-text-muted">
        รองรับ TXT, MD, JSON, CSV, HTML, CSS, JS/TS/JSX/TSX, XML, YAML, SQL, PDF, Word, Excel, PowerPoint
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files, projectId);
          e.target.value = "";
        }}
      />
    </div>
  );
}
