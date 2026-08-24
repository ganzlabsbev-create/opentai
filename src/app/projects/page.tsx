"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectList } from "@/features/projects/components/ProjectList";

export default function ProjectsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="โปรเจกต์" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-2.5">
        <ProjectList />
      </div>
    </>
  );
}
