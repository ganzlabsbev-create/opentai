"use client";

import { useEffect, useState } from "react";
import type { MesonCategory, MesonModelInfo } from "@/ai/meson/types";

/**
 * Loads the live-checked Meson model list (same `/api/meson/models` route
 * the admin status page uses) and returns just the entries for one
 * category, ready to use to use in a picker. Models with a live status of
 * "unavailable" are filtered out — no point offering a pick that would
 * 404 at request time.
 */
export function useMesonModels(category: MesonCategory) {
  const [models, setModels] = useState<MesonModelInfo[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meson/models")
      .then((r) => r.json())
      .then((d: { models: MesonModelInfo[] }) => {
        if (cancelled) return;
        const list = d.models.filter((m) => m.category === category && m.status !== "unavailable");
        setModels(list);
        setSelected((prev) => prev || list[0]?.mesonId || "");
      })
      .catch(() => {
        if (!cancelled) setError("โหลดรายชื่อโมเดลไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return { models, selected, setSelected, error };
}
