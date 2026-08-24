export interface Project {
  id: string;
  name: string;
  desc: string;
  createdAt: number;
  updatedAt: number;
}

export type DiffLineType = "ctx" | "add" | "del";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}
