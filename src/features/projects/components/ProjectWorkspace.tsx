"use client";

import { FolderOpen, GitCompare, Link2, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { MarkdownMessage } from "@/components/shared/MarkdownMessage";
import { DiffViewer } from "@/components/shared/DiffViewer";
import { FileDropzone } from "@/features/files/components/FileDropzone";
import { ProjectActions } from "@/features/projects/components/ProjectActions";
import { useFiles } from "@/features/files/store/FilesProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useRouter } from "next/navigation";
import { assembleContext, type ContextSourceFile } from "@/core/context";
import { diffLines } from "@/core/diff";
import { extractCodeMetadata } from "@/core/code";
import { routeGenerate } from "@/ai/router";
import { getProvider } from "@/ai/providers";
import { writeFileBytes } from "@/core/files";
import { parseFile } from "@/core/parsers";
import { updateFileRecord } from "@/core/storage";
import { AppError } from "@/types/errors";
import { fileIcon, formatBytes } from "@/lib/format";
import type { Project } from "@/types/project";

const ACTION_PROMPTS: Record<string, string> = {
  analyze: "วิเคราะห์ภาพรวมของโปรเจกต์นี้จากไฟล์ที่แนบมา สรุปโครงสร้างและจุดสำคัญ",
  review: "รีวิวโค้ดในไฟล์ที่แนบมา ชี้จุดที่ควรปรับปรุงเรื่องความชัดเจนและ maintainability",
  errors: "ช่วยหาข้อผิดพลาดหรือจุดเสี่ยงในไฟล์ที่แนบมา พร้อมอธิบายเหตุผล",
  fix: "แนะนำแนวทางการแก้ไขปรับปรุงไฟล์ที่แนบมา พร้อมตัวอย่างโค้ดถ้าเกี่ยวข้อง",
};

interface ProjectHeaderProps {
  project: Project;
  fileCount: number;
}

export function ProjectHeader({ project, fileCount }: ProjectHeaderProps) {
  return (
    <div className="mb-4">
      <div className="text-xs text-text-muted">{fileCount} ไฟล์ในโปรเจกต์นี้</div>
    </div>
  );
}

function ProjectFileList({ projectId }: { projectId: string }) {
  const { filesForProject, removeFile } = useFiles();
  const files = filesForProject(projectId);
  if (files.length === 0) return null;
  return (
    <div className="mb-4">
      {files.map((f, i) => {
        const Icon = fileIcon(f.kind);
        return (
          <div key={f.id} className={`flex items-center gap-3 py-2 ${i < files.length - 1 ? "border-b border-border" : ""}`}>
            <Icon size={16} className="text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-text">{f.name}</div>
              <div className="text-[11px] text-text-muted">{formatBytes(f.size)}</div>
            </div>
            <IconButton icon={Trash2} size={14} title="ลบออกจากโปรเจกต์" onClick={() => removeFile(f.id)} />
          </div>
        );
      })}
    </div>
  );
}

/** "สร้าง patch": pick a real project file, edit it, and diff the edit against the stored original via core/diff. */
function PatchEditor({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const toast = useToast();
  const { filesForProject, readFileContent } = useFiles();
  const files = filesForProject(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(files[0]?.id ?? null);
  const [original, setOriginal] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [diff, setDiff] = useState<ReturnType<typeof diffLines> | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const selectedFile = files.find((f) => f.id === selectedId);

  const loadFile = async (id: string) => {
    setSelectedId(id);
    setDiff(null);
    setLoadingContent(true);
    try {
      const text = await readFileContent(id);
      setOriginal(text);
      setDraft(text);
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    } finally {
      setLoadingContent(false);
    }
  };

  if (files.length === 0) {
    return <EmptyState icon={GitCompare} title="โปรเจกต์นี้ยังไม่มีไฟล์" desc="เพิ่มไฟล์ก่อนเพื่อสร้าง patch" />;
  }

  return (
    <div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => loadFile(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] ${
              selectedId === f.id ? "border-accent bg-accent-soft text-accent" : "border-border text-text-muted"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {!selectedFile ? (
        <div className="py-6 text-center text-[13px] text-text-muted">เลือกไฟล์ด้านบนเพื่อเริ่มแก้ไข</div>
      ) : loadingContent ? (
        <div className="py-6 text-center text-[13px] text-text-muted">กำลังโหลดเนื้อหาไฟล์...</div>
      ) : diff ? (
        <div className="mb-3">
          <DiffViewer
            fileName={selectedFile.name}
            diff={diff}
            onApply={async () => {
              try {
                await writeFileBytes(selectedFile.id, draft);
                const reparsed = parseFile(selectedFile.name, draft, selectedFile.mimeType);
                await updateFileRecord(selectedFile.id, {
                  updatedAt: Date.now(),
                  size: new Blob([draft]).size,
                  preview: reparsed.preview,
                });
                toast("นำการแก้ไขไปใช้กับไฟล์แล้ว");
                onClose();
              } catch (err) {
                toast(AppError.from(err).userMessage, "danger");
              }
            }}
            onReject={() => {
              setDiff(null);
              toast("ปฏิเสธการแก้ไข ยังคงเนื้อหาเดิม");
            }}
          />
        </div>
      ) : (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border bg-surface-sunk p-2.5 font-mono text-[12.5px] text-text outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="accent"
              icon={GitCompare}
              disabled={draft === original}
              onClick={() => setDiff(diffLines(original, draft))}
            >
              เปรียบเทียบการแก้ไข
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DepsPanel({ projectId }: { projectId: string }) {
  const { filesForProject, readFileContent } = useFiles();
  const files = filesForProject(projectId).filter((f) => f.kind === "code");
  const [results, setResults] = useState<{ name: string; imports: string[] }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const out = await Promise.all(
      files.map(async (f) => {
        try {
          const text = await readFileContent(f.id);
          const { imports } = extractCodeMetadata(text);
          return { name: f.name, imports };
        } catch {
          return { name: f.name, imports: [] };
        }
      })
    );
    setResults(out);
    setLoading(false);
  };

  if (files.length === 0) {
    return <EmptyState icon={Link2} title="ไม่มีไฟล์โค้ดในโปรเจกต์นี้" desc="เพิ่มไฟล์ .js/.ts/.jsx/.tsx เพื่อวิเคราะห์ dependency" />;
  }

  return (
    <div>
      {!results ? (
        <Button size="sm" variant="accent" icon={Link2} onClick={run} disabled={loading}>
          {loading ? "กำลังวิเคราะห์..." : "หา dependency"}
        </Button>
      ) : (
        results.map((r) => (
          <div key={r.name} className="border-b border-border py-2.5 last:border-b-0">
            <div className="text-[13px] font-medium text-text">{r.name}</div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">
              {r.imports.length === 0 ? "ไม่พบการ import" : r.imports.join(", ")}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** analyze / review / errors / fix — real AI calls with context assembled from real project files. */
function AiActionPanel({ actionId, projectId }: { actionId: string; projectId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { filesForProject, readFileContent } = useFiles();
  const { settings } = useSettings();
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  const defaultProvider = getProvider(settings.defaultProviderId);
  const hasConfiguredProvider = !!defaultProvider?.isConfigured(settings.apiKeys[settings.defaultProviderId]);

  const run = async () => {
    const files = filesForProject(projectId);
    setRunning(true);
    setError(null);
    setOutput("");
    try {
      const contextFiles: ContextSourceFile[] = await Promise.all(
        files.map(async (f) => ({ id: f.id, name: f.name, text: await readFileContent(f.id).catch(() => f.preview) }))
      );
      const assembled = assembleContext(contextFiles);
      const gen = routeGenerate({
        messages: [{ role: "user", content: ACTION_PROMPTS[actionId] ?? "วิเคราะห์ไฟล์ที่แนบมา" }],
        context: assembled.text,
        settings,
        onProviderSelected: (providerId, modelId) => setProviderLabel(`${providerId} / ${modelId}`),
      });
      let last = "";
      for await (const chunk of gen) {
        last = chunk;
        setOutput(last);
      }
    } catch (err) {
      setError(AppError.from(err));
    } finally {
      setRunning(false);
    }
  };

  if (!hasConfiguredProvider && running === false && output === "" && error === null) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="ยังไม่ได้ตั้งค่า AI provider สำหรับการวิเคราะห์นี้"
        desc="ไปที่หน้าโมเดลเพื่อเชื่อมต่อ provider ก่อน (Meson ใช้งานได้ทันทีผ่าน key กลาง ไม่ต้องตั้งค่าเพิ่ม)"
      />
    );
  }

  return (
    <div>
      {!running && !output && !error && (
        <Button size="sm" variant="accent" onClick={run}>
          เรียกใช้
        </Button>
      )}
      {running && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="animate-spin text-text-muted" />
          <span className="text-[13px] text-text-muted">กำลังประมวลผล{providerLabel ? ` ผ่าน ${providerLabel}` : "..."}</span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          {error.userMessage}
          {error.code === "INVALID_API_KEY" && (
            <button onClick={() => router.push("/models")} className="ml-2 border-0 bg-none font-semibold underline">
              ไปตั้งค่า provider
            </button>
          )}
        </div>
      )}
      {output && <MarkdownMessage text={output} />}
      {!running && (output || error) && (
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={run}>
            เรียกใช้อีกครั้ง
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProjectWorkspace({ project }: { project: Project }) {
  const { filesForProject } = useFiles();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const fileCount = filesForProject(project.id).length;

  return (
    <>
      <ProjectHeader project={project} fileCount={fileCount} />
      <FileDropzone projectId={project.id} />
      <ProjectFileList projectId={project.id} />
      <ProjectActions onAction={setActiveAction} />

      {activeAction === "patch" && <PatchEditor projectId={project.id} onClose={() => setActiveAction(null)} />}
      {activeAction === "deps" && <DepsPanel projectId={project.id} />}
      {activeAction && ["analyze", "review", "errors", "fix"].includes(activeAction) && (
        <AiActionPanel key={activeAction} actionId={activeAction} projectId={project.id} />
      )}
      {!activeAction && <EmptyState icon={GitCompare} title="เลือกการทำงานด้านบน" desc="วิเคราะห์ รีวิว หรือสร้าง patch จากไฟล์จริงในโปรเจกต์" />}
    </>
  );
}
