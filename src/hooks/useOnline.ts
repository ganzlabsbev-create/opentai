"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser connectivity. Used by the AI router (Phase 2 §6/§7) to
 * decide whether to attempt a network provider or fall straight to the
 * OFFLINE error state.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
