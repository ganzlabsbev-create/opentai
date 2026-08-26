"use client";

import { Cpu, Folder, FolderKanban, Image, Moon, Plus, Search, Settings as SettingsIcon, Sun, Wand2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { useConversations } from "@/features/chat/store/ConversationsProvider";

const DRAWER_LINKS = [
  { id: "projects", label: "โปรเจกต์", icon: FolderKanban, href: "/projects" },
  { id: "files", label: "ไฟล์", icon: Folder, href: "/files" },
  { id: "library", label: "คลังสื่อ", icon: Image, href: "/library" },
  { id: "meson", label: "เครื่องมือ AI", icon: Wand2, href: "/meson" },
  { id: "models", label: "โมเดล", icon: Cpu, href: "/models" },
  { id: "settings", label: "ตั้งค่า", icon: SettingsIcon, href: "/settings" },
];

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

export function Drawer({ open, onClose }: DrawerProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { conversations, activeConvId } = useConversations();
  const [query, setQuery] = useState("");
  const filteredConversations = query.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations;

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-overlay transition-opacity"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />
      <div
        className="fixed bottom-0 left-0 top-0 z-[51] flex w-[296px] max-w-[84vw] flex-col border-r border-border bg-surface transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${open ? 0 : "-100%"})` }}
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3.5">
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] bg-accent p-[4px]">
              <img src="/brand/ot-mark-white.svg" alt="" className="h-full w-full dark:hidden" />
              <img src="/brand/ot-mark.svg" alt="" className="hidden h-full w-full dark:block" />
            </div>
            <img src="/brand/opentai-wordmark.svg" alt="OpenTai" className="h-[15px] w-auto dark:hidden" />
            <img src="/brand/opentai-wordmark-white.svg" alt="OpenTai" className="hidden h-[15px] w-auto dark:block" />
          </div>
          <IconButton icon={X} onClick={onClose} title="ปิด" />
        </div>

        <div className="px-3 py-1.5">
          <button
            onClick={() => go("/")}
            className="flex w-full items-center gap-2.5 rounded-md border border-border bg-transparent px-2.5 py-2.5"
          >
            <Plus size={16} className="text-text" />
            <span className="text-[13.5px] font-medium text-text">แชทใหม่</span>
          </button>
        </div>

        <div className="px-3 pb-1 pt-2.5">
          <div className="flex items-center gap-2 rounded-md bg-surface-sunk px-2.5 py-2">
            <Search size={14} className="text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาแชท"
              className="flex-1 border-0 bg-transparent text-[13px] text-text outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredConversations.length === 0 ? (
            <div className="px-2 py-2.5 text-[12.5px] text-text-muted">
              {conversations.length === 0 ? "ยังไม่มีบทสนทนา" : "ไม่พบแชทที่ค้นหา"}
            </div>
          ) : (
            filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => go(`/chat/${c.id}`)}
                className={`mb-px flex w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[9px] px-2.5 py-2.5 text-left text-[13.5px] text-text ${
                  activeConvId === c.id ? "bg-surface-sunk" : "bg-transparent"
                }`}
              >
                {c.title}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border px-2 py-2">
          {DRAWER_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.href)}
              className="flex w-full items-center gap-2.5 rounded-[9px] bg-transparent px-2.5 py-2.5"
            >
              <l.icon size={16} className="text-text-muted" />
              <span className="text-[13.5px] text-text">{l.label}</span>
            </button>
          ))}
          <button onClick={toggleTheme} className="flex w-full items-center gap-2.5 rounded-[9px] bg-transparent px-2.5 py-2.5">
            {theme === "light" ? <Moon size={16} className="text-text-muted" /> : <Sun size={16} className="text-text-muted" />}
            <span className="text-[13.5px] text-text">{theme === "light" ? "โหมดมืด" : "โหมดสว่าง"}</span>
          </button>
        </div>
      </div>
    </>
  );
}
