"use client";

import { AlertCircle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { nid } from "@/lib/id";

type ToastTone = "ok" | "danger";

interface ToastItem {
  id: string;
  msg: string;
  tone: ToastTone;
}

interface ToastCtxValue {
  toast: (msg: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastCtxValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, tone: ToastTone = "ok") => {
    const id = nid("toast");
    setItems((ts) => [...ts, { id, msg, tone }]);
    setTimeout(() => setItems((ts) => ts.filter((x) => x.id !== id)), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[60] flex flex-col gap-2 left-4 right-4 bottom-24">
        {items.map((x) => (
          <div
            key={x.id}
            className="mx-auto flex w-full max-w-sm items-center gap-2 rounded-lg bg-text px-3.5 py-2.5 text-sm text-bg"
          >
            {x.tone === "danger" ? <AlertCircle size={14} /> : <Check size={14} />}
            <span className="flex-1">{x.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
