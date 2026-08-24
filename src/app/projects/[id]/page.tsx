"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FolderKanban } from "lucide-react";
import { ProjectWorkspace } from "@/features/projects/components/ProjectWorkspace";
import { useProjects } from "@/features/projects/store/ProjectsProvider";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getProject, loaded } = useProjects();
  const project = getProject(params.id);

  return (
    <>
      <TopBar title={project?.name ?? "โปรเจกต์"} onBack={() => router.push("/projects")} />
      <div className="flex-1 overflow-y-auto px-4 py-2.5">
        {project ? (
          <ProjectWorkspace project={project} />
        ) : !loaded ? (
          <div className="py-10 text-center text-[13px] text-text-muted">กำลังโหลด...</div>
        ) : (
          <EmptyState icon={FolderKanban} title="ไม่พบโปรเจกต์นี้" desc="อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง" />
        )}
      </div>
    </>
  );
}
