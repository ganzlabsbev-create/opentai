"use client";

import { Folder, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { fileIcon, formatBytes, formatRelativeTime } from "@/lib/format";
import { useFiles } from "@/features/files/store/FilesProvider";
import type { SearchResult } from "@/core/search";

export function FileTree() {
  const { files, loaded, removeFile, searchFiles } = useFiles();
  const [query, setQuery] = useState("");
  const [contentResults, setContentResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setContentResults(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      searchFiles(query).then((results) => {
        if (!cancelled) setContentResults(results);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, searchFiles]);

  const byName = files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  const matchIds = new Set([...byName.map((f) => f.id), ...(contentResults?.map((r) => r.id) ?? [])]);
  const snippetById = new Map((contentResults ?? []).map((r) => [r.id, r.snippet]));
  const filtered = files.filter((f) => (query.trim() ? matchIds.has(f.id) : true));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-md bg-surface-sunk px-3 py-2">
        <Search size={14} className="text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาไฟล์ (ชื่อหรือเนื้อหา)"
          className="flex-1 border-0 bg-transparent text-[13.5px] text-text outline-none"
        />
      </div>

      {!loaded ? (
        <div className="py-10 text-center text-[13px] text-text-muted">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Folder}
          title={files.length === 0 ? "ยังไม่มีไฟล์" : "ไม่พบไฟล์"}
          desc={files.length === 0 ? "ลากไฟล์มาวางด้านบนเพื่อเริ่มต้น" : "ลองคำค้นอื่น"}
        />
      ) : (
        <div>
          {filtered.map((f, i) => {
            const Icon = fileIcon(f.kind);
            const snippet = snippetById.get(f.id);
            return (
              <div
                key={f.id}
                className={`flex items-center gap-3 py-2.5 ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
              >
                <Icon size={17} className="text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] text-text">{f.name}</div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-text-muted">
                    {formatBytes(f.size)} · {formatRelativeTime(f.updatedAt)}
                    {!f.parsed && " · แยกวิเคราะห์ไม่สำเร็จ"}
                  </div>
                  {snippet && <div className="mt-0.5 truncate text-[11px] text-text-muted italic">&quot;{snippet}&quot;</div>}
                </div>
                <IconButton icon={Trash2} size={15} title="ลบ" onClick={() => removeFile(f.id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
