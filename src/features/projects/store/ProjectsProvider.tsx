"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Project } from "@/types/project";
import { nid } from "@/lib/id";
import { createProjectRecord, deleteProjectRecord, listProjects, updateProjectRecord } from "@/core/storage";
import { AppError } from "@/types/errors";
import { useToast } from "@/components/ui/Toast";

interface ProjectsCtxValue {
  projects: Project[];
  loaded: boolean;
  getProject: (id: string) => Project | undefined;
  createProject: (name: string, desc?: string) => string;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  touchProject: (id: string) => void;
}

const ProjectsContext = createContext<ProjectsCtxValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => toast(AppError.from(err).userMessage, "danger"))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const createProject = useCallback(
    (name: string, desc = "") => {
      const id = nid("proj");
      const now = Date.now();
      const project: Project = { id, name, desc, createdAt: now, updatedAt: now };
      setProjects((ps) => [project, ...ps]);
      createProjectRecord(project).catch((err) => toast(AppError.from(err).userMessage, "danger"));
      return id;
    },
    [toast]
  );

  const renameProject = useCallback(
    async (id: string, name: string) => {
      setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)));
      try {
        await updateProjectRecord(id, { name });
      } catch (err) {
        toast(AppError.from(err).userMessage, "danger");
      }
    },
    [toast]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      setProjects((ps) => ps.filter((p) => p.id !== id));
      try {
        await deleteProjectRecord(id);
      } catch (err) {
        toast(AppError.from(err).userMessage, "danger");
      }
    },
    [toast]
  );

  const touchProject = useCallback((id: string) => {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, updatedAt: Date.now() } : p)));
    updateProjectRecord(id, {}).catch(() => {});
  }, []);

  return (
    <ProjectsContext.Provider value={{ projects, loaded, getProject, createProject, renameProject, deleteProject, touchProject }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
