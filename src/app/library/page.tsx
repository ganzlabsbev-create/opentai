"use client";

import { Download, FileText, Image as ImageIcon, Loader2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { readFileBytes } from "@/core/files";
import { useFiles } from "@/features/files/store/FilesProvider";
import { fileIcon, formatBytes, formatRelativeTime } from "@/lib/format";
import { AppError } from "@/types/errors";
import type { FileEntry, FileMediaType } from "@/types/file";

type LibraryTab = "image" | "document" | "audio";

const TABS: { id: LibraryTab; label: string }[] = [
  { id: "image", label: "รูป" },
  { id: "document", label: "ไฟล์" },
  { id: "audio", label: "เสียง" },
];

function download(name: string, mimeType: string, buf: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([buf], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Grid of image thumbnails. Reads bytes from OPFS per-item and revokes each object URL on unmount/tab change — the exact leak the meson Studios hit before. */
function ImageGrid({ files }: { files: FileEntry[] }) {
  const toast = useToast();
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    (async () => {
      for (const f of files) {
        try {
          const buf = await readFileBytes(f.id);
          if (cancelled) return;
          const url = URL.createObjectURL(new Blob([buf], { type: f.mimeType }));
          created.push(url);
          setUrls((prev) => ({ ...prev, [f.id]: url }));
        } catch (err) {
          if (!cancelled) toast(AppError.from(err).userMessage, "danger");
        }
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.id).join(",")]);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {files.map((f) => (
        <a
          key={f.id}
          href={urls[f.id]}
          download={f.name}
          className="block overflow-hidden rounded-md border border-border bg-surface-sunk"
        >
          {urls[f.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[f.id]} alt={f.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center">
              <Loader2 size={16} className="animate-spin text-text-muted" />
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function DocumentList({ files }: { files: FileEntry[] }) {
  const toast = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (f: FileEntry) => {
    setDownloadingId(f.id);
    try {
      const buf = await readFileBytes(f.id);
      download(f.name, f.mimeType, buf);
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      {files.map((f, i) => {
        const Icon = fileIcon(f.kind) ?? FileText;
        return (
          <button
            key={f.id}
            onClick={() => handleDownload(f)}
            disabled={downloadingId === f.id}
            className={`flex w-full items-center gap-3 py-2.5 text-left ${i < files.length - 1 ? "border-b border-border" : ""}`}
          >
            <Icon size={16} className="shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-text">{f.name}</div>
              <div className="text-[11px] text-text-muted">
                {formatBytes(f.size)} · {formatRelativeTime(f.createdAt)}
              </div>
            </div>
            {downloadingId === f.id ? (
              <Loader2 size={14} className="shrink-0 animate-spin text-text-muted" />
            ) : (
              <Download size={14} className="shrink-0 text-text-muted" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AudioList({ files }: { files: FileEntry[] }) {
  const toast = useToast();
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    (async () => {
      for (const f of files) {
        try {
          const buf = await readFileBytes(f.id);
          if (cancelled) return;
          const url = URL.createObjectURL(new Blob([buf], { type: f.mimeType }));
          created.push(url);
          setUrls((prev) => ({ ...prev, [f.id]: url }));
        } catch (err) {
          if (!cancelled) toast(AppError.from(err).userMessage, "danger");
        }
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.map((f) => f.id).join(",")]);

  return (
    <div>
      {files.map((f, i) => (
        <div key={f.id} className={`flex items-center gap-3 py-2.5 ${i < files.length - 1 ? "border-b border-border" : ""}`}>
          <Volume2 size={16} className="shrink-0 text-text-muted" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] text-text">{f.name}</div>
            {urls[f.id] ? (
              <audio controls src={urls[f.id]} className="mt-1 h-8 w-full" />
            ) : (
              <div className="mt-1 text-[11px] text-text-muted">กำลังโหลด...</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const EMPTY_COPY: Record<LibraryTab, { title: string; desc: string }> = {
  image: { title: "ยังไม่มีรูปที่ AI สร้าง", desc: "ลองสร้างรูปภาพจากเมนู \"เครื่องมือ AI\" หรือในแชท" },
  document: { title: "ยังไม่มีไฟล์ที่ AI สร้าง", desc: "ไฟล์ที่ AI ตอบกลับมาจะเก็บไว้ที่นี่" },
  audio: { title: "ยังไม่มีเสียงที่ AI สร้าง", desc: "ลองแปลงข้อความเป็นเสียงจากเมนู \"เครื่องมือ AI\" หรือในแชท" },
};

export default function LibraryPage() {
  const router = useRouter();
  const { files, loaded } = useFiles();
  const [tab, setTab] = useState<LibraryTab>("image");

  const mediaType: FileMediaType = tab;
  const tabFiles = files
    .filter((f) => f.source === "ai-generated" && f.mediaType === mediaType)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <TopBar title="คลังสื่อ" onBack={() => router.push("/")} />
      <div className="flex gap-1.5 border-b border-border px-4 pb-2 pt-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${
              tab === t.id ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <div className="py-10 text-center text-[13px] text-text-muted">กำลังโหลด...</div>
        ) : tabFiles.length === 0 ? (
          <EmptyState icon={tab === "image" ? ImageIcon : tab === "audio" ? Volume2 : FileText} {...EMPTY_COPY[tab]} />
        ) : tab === "image" ? (
          <ImageGrid files={tabFiles} />
        ) : tab === "audio" ? (
          <AudioList files={tabFiles} />
        ) : (
          <DocumentList files={tabFiles} />
        )}
      </div>
    </>
  );
}
