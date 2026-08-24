"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { FileDropzone } from "@/features/files/components/FileDropzone";
import { FileTree } from "@/features/files/components/FileTree";

export default function FilesPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="ไฟล์" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-2.5">
        <FileDropzone />
        <FileTree />
      </div>
    </>
  );
}
