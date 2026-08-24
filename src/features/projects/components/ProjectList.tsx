"use client";

import { ChevronRight, FolderKanban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime } from "@/lib/format";
import { useFiles } from "@/features/files/store/FilesProvider";
import { useProjects } from "@/features/projects/store/ProjectsProvider";

export function ProjectList() {
  const router = useRouter();
  const toast = useToast();
  const { projects, loaded, createProject } = useProjects();
  const { filesForProject } = useFiles();

  const handleCreate = () => {
    const name = window.prompt("ชื่อโปรเจกต์ใหม่");
    if (!name) return;
    const id = createProject(name);
    toast(`สร้างโปรเจกต์ "${name}" แล้ว`);
    router.push(`/projects/${id}`);
  };

  return (
    <div>
      <div className="mb-2.5 flex justify-end">
        <Button size="sm" variant="outline" icon={Plus} onClick={handleCreate}>
          ใหม่
        </Button>
      </div>
      {!loaded ? (
        <div className="py-10 text-center text-[13px] text-text-muted">กำลังโหลด...</div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="ยังไม่มีโปรเจกต์" desc="กด 'ใหม่' เพื่อสร้างโปรเจกต์แรก" />
      ) : (
        projects.map((p, i) => {
          const fileCount = filesForProject(p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className={`flex w-full items-center gap-3 border-0 bg-transparent py-3 text-left ${
                i < projects.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="rounded-md bg-accent-soft p-2.5">
                <FolderKanban size={16} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text">{p.name}</div>
                <div className="text-xs text-text-muted">
                  {p.desc ? `${p.desc} · ` : ""}
                  {fileCount} ไฟล์ · อัปเดต {formatRelativeTime(p.updatedAt)}
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted" />
            </button>
          );
        })
      )}
    </div>
  );
}
