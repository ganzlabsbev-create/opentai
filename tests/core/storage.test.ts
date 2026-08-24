import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendMessageRecords,
  clearAllConversations,
  clearAllStorage,
  createConversationRecord,
  createProjectRecord,
  deleteConversationRecord,
  deleteFileRecord,
  deleteProjectRecord,
  getFileRecord,
  getSettings,
  listConversations,
  listFiles,
  listProjects,
  putFileRecord,
  setSettings,
  updateFileRecord,
  updateMessageRecord,
} from "@/core/storage";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { Conversation } from "@/types/chat";
import type { Project } from "@/types/project";
import type { FileEntry } from "@/types/file";

beforeEach(async () => {
  await clearAllStorage();
});

describe("core/storage conversations", () => {
  it("creates and lists a conversation with its messages", async () => {
    const conv: Conversation = {
      id: "c1",
      title: "test",
      createdAt: 1,
      updatedAt: 1,
      messages: [{ id: "m1", role: "user", content: "hi" }],
    };
    await createConversationRecord(conv);
    const all = await listConversations();
    expect(all).toHaveLength(1);
    expect(all[0]?.messages).toHaveLength(1);
    expect(all[0]?.messages[0]?.content).toBe("hi");
  });

  it("appends messages and updates a message in place", async () => {
    const conv: Conversation = { id: "c2", title: "t", createdAt: 1, updatedAt: 1, messages: [] };
    await createConversationRecord(conv);
    await appendMessageRecords("c2", [{ id: "m1", role: "assistant", content: "", streaming: true }]);
    await updateMessageRecord("c2", "m1", { content: "done", streaming: false });

    const all = await listConversations();
    const found = all.find((c) => c.id === "c2");
    expect(found?.messages[0]?.content).toBe("done");
    expect(found?.messages[0]?.streaming).toBe(false);
  });

  it("deletes a conversation and its messages", async () => {
    const conv: Conversation = { id: "c3", title: "t", createdAt: 1, updatedAt: 1, messages: [{ id: "m1", role: "user", content: "x" }] };
    await createConversationRecord(conv);
    await deleteConversationRecord("c3");
    const all = await listConversations();
    expect(all.find((c) => c.id === "c3")).toBeUndefined();
  });

  it("clears all conversations", async () => {
    await createConversationRecord({ id: "c4", title: "t", createdAt: 1, updatedAt: 1, messages: [] });
    await clearAllConversations();
    expect(await listConversations()).toHaveLength(0);
  });
});

describe("core/storage projects", () => {
  it("creates, lists, and deletes a project", async () => {
    const project: Project = { id: "p1", name: "Demo", desc: "", createdAt: 1, updatedAt: 1 };
    await createProjectRecord(project);
    expect(await listProjects()).toHaveLength(1);
    await deleteProjectRecord("p1");
    expect(await listProjects()).toHaveLength(0);
  });
});

describe("core/storage files", () => {
  it("stores and updates file metadata", async () => {
    const file: FileEntry = {
      id: "f1",
      name: "a.txt",
      kind: "txt",
      mimeType: "text/plain",
      size: 5,
      createdAt: 1,
      updatedAt: 1,
      projectId: null,
      parsed: true,
      preview: "hello",
    };
    await putFileRecord(file);
    expect(await getFileRecord("f1")).toMatchObject({ name: "a.txt" });

    await updateFileRecord("f1", { preview: "updated" });
    expect((await getFileRecord("f1"))?.preview).toBe("updated");

    await deleteFileRecord("f1");
    expect(await getFileRecord("f1")).toBeUndefined();
  });

  it("scopes listFiles by projectId", async () => {
    await putFileRecord({
      id: "f2",
      name: "x",
      kind: "txt",
      mimeType: "text/plain",
      size: 1,
      createdAt: 1,
      updatedAt: 1,
      projectId: "proj-1",
      parsed: true,
      preview: "",
    });
    await putFileRecord({
      id: "f3",
      name: "y",
      kind: "txt",
      mimeType: "text/plain",
      size: 1,
      createdAt: 1,
      updatedAt: 1,
      projectId: null,
      parsed: true,
      preview: "",
    });
    expect(await listFiles("proj-1")).toHaveLength(1);
    expect(await listFiles(null)).toHaveLength(2);
  });
});

describe("core/storage settings", () => {
  it("returns defaults when nothing is stored", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a partial patch over the current settings", async () => {
    await setSettings({ devMode: true });
    const s = await getSettings();
    expect(s.devMode).toBe(true);
    expect(s.language).toBe(DEFAULT_SETTINGS.language);
  });
});
