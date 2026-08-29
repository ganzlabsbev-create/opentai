"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { nid } from "@/lib/id";
import { deleteFileBytes, readFileText, writeFileBytes } from "@/core/files";
import { deleteFileRecord, listFiles, putFileRecord } from "@/core/storage";
import { isSupportedFile, parseFile, MAX_PARSEABLE_BYTES, isBinaryDocument, parseBinaryDocument, MAX_BINARY_BYTES } from "@/core/parsers";
import { extOf } from "@/core/parsers/types";
import { buildSearchIndex, search as searchIndex, type SearchResult } from "@/core/search";
import { AppError } from "@/types/errors";
import { useToast } from "@/components/ui/Toast";
import type { FileEntry, FileKind } from "@/types/file";

function kindFromParsedKind(k: FileKind): FileKind {
  return k;
}

function extToFallbackKind(name: string): FileKind {
  const ext = extOf(name);
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext)) return "code";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  if (ext === "xml") return "xml";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "sql") return "sql";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "xlsx";
  if (ext === "pptx") return "pptx";
  if (ext === "txt" || ext === "") return "txt";
  return "other";
}

/** Binary document kinds store *original* bytes in OPFS (not UTF-8-decodable) — their searchable text lives in FileEntry.extractedText instead. */
function isBinaryKind(kind: FileKind): boolean {
  return kind === "pdf" || kind === "docx" || kind === "xlsx" || kind === "pptx";
}

interface FilesCtxValue {
  files: FileEntry[];
  loaded: boolean;
  /** Ingests real browser File objects: parses, stores bytes in OPFS, stores metadata in IndexedDB. */
  addFiles: (fileList: FileList | File[], projectId?: string | null) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  readFileContent: (id: string) => Promise<string>;
  searchFiles: (query: string, projectId?: string | null) => Promise<SearchResult[]>;
  filesForProject: (projectId: string) => FileEntry[];
  /**
   * Merges a FileEntry that was already written to OPFS + IndexedDB by
   * something outside this provider (e.g. `saveAssistantFile`) into local
   * state, so /library and anything else reading `files` picks it up
   * without waiting for a reload. Does not touch storage itself.
   */
  registerFile: (entry: FileEntry) => void;
}

const FilesContext = createContext<FilesCtxValue | null>(null);

export function FilesProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listFiles(null)
      .then(setFiles)
      .catch((err) => toast(AppError.from(err).userMessage, "danger"))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[], projectId: string | null = null) => {
      const arr = Array.from(fileList);
      for (const file of arr) {
        if (!isSupportedFile(file.name)) {
          toast(new AppError("FILE_UNSUPPORTED", `ไม่รองรับไฟล์: ${file.name}`).userMessage, "danger");
          continue;
        }

        const binary = isBinaryDocument(file.name);
        const sizeLimit = binary ? MAX_BINARY_BYTES : MAX_PARSEABLE_BYTES;
        if (file.size > sizeLimit) {
          toast(new AppError("FILE_TOO_LARGE", `ไฟล์ใหญ่เกินไป: ${file.name}`).userMessage, "danger");
          continue;
        }

        const id = nid("file");
        const now = Date.now();
        try {
          if (binary) {
            // PDF/DOCX/XLSX/PPTX: keep the *original* bytes in OPFS
            // (untouched — useful if we ever want to re-parse or let the
            // person download it back), and separately extract plain text
            // via the format-specific parser for the model/search to use.
            const buf = await file.arrayBuffer();
            let kind: FileKind = extToFallbackKind(file.name);
            let preview = `[${file.name}]`;
            let extractedText: string | undefined;
            let parsed = false;
            try {
              const result = await parseBinaryDocument(file.name, buf);
              kind = kindFromParsedKind(result.kind);
              preview = result.preview;
              extractedText = result.text;
              parsed = true;
            } catch (parseErr) {
              toast(AppError.from(parseErr).userMessage, "danger");
            }

            await writeFileBytes(id, buf);
            const entry: FileEntry = {
              id,
              name: file.name,
              kind,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
              createdAt: now,
              updatedAt: now,
              projectId,
              parsed,
              preview,
              extractedText,
              source: "uploaded",
            };
            await putFileRecord(entry);
            setFiles((fs) => [entry, ...fs]);
            continue;
          }

          const text = await file.text();
          let kind: FileKind = extToFallbackKind(file.name);
          let preview = text.slice(0, 200);
          let parsed = false;
          try {
            const result = parseFile(file.name, text, file.type);
            kind = kindFromParsedKind(result.kind);
            preview = result.preview;
            parsed = true;
          } catch (parseErr) {
            // Store the file anyway with the raw preview — a failed parse
            // shouldn't block ingestion, just mark it unparsed.
            toast(AppError.from(parseErr).userMessage, "danger");
          }

          await writeFileBytes(id, text);
          const entry: FileEntry = {
            id,
            name: file.name,
            kind,
            mimeType: file.type || "text/plain",
            size: file.size,
            createdAt: now,
            updatedAt: now,
            projectId,
            parsed,
            preview,
            source: "uploaded",
          };
          await putFileRecord(entry);
          setFiles((fs) => [entry, ...fs]);
        } catch (err) {
          toast(AppError.from(err).userMessage, "danger");
        }
      }
    },
    [toast]
  );

  const removeFile = useCallback(
    async (id: string) => {
      setFiles((fs) => fs.filter((f) => f.id !== id));
      try {
        await deleteFileRecord(id);
        await deleteFileBytes(id);
      } catch (err) {
        toast(AppError.from(err).userMessage, "danger");
      }
    },
    [toast]
  );

  const readFileContent = useCallback(
    async (id: string) => {
      const entry = files.find((f) => f.id === id);
      if (entry && isBinaryKind(entry.kind)) return entry.extractedText ?? "";
      return readFileText(id);
    },
    [files]
  );

  const searchFiles = useCallback(
    async (query: string, projectId: string | null = null) => {
      const scoped = projectId === null ? files : files.filter((f) => f.projectId === projectId);
      const docs = await Promise.all(
        scoped.map(async (f) => {
          if (isBinaryKind(f.kind)) return { id: f.id, name: f.name, text: f.extractedText ?? f.preview };
          try {
            const text = await readFileText(f.id);
            return { id: f.id, name: f.name, text };
          } catch {
            return { id: f.id, name: f.name, text: f.preview };
          }
        })
      );
      const index = buildSearchIndex(docs);
      return searchIndex(index, query);
    },
    [files]
  );

  const filesForProject = useCallback((projectId: string) => files.filter((f) => f.projectId === projectId), [files]);

  const registerFile = useCallback((entry: FileEntry) => {
    setFiles((fs) => (fs.some((f) => f.id === entry.id) ? fs.map((f) => (f.id === entry.id ? entry : f)) : [entry, ...fs]));
  }, []);

  return (
    <FilesContext.Provider
      value={{ files, loaded, addFiles, removeFile, readFileContent, searchFiles, filesForProject, registerFile }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFiles() {
  const ctx = useContext(FilesContext);
  if (!ctx) throw new Error("useFiles must be used within FilesProvider");
  return ctx;
}
