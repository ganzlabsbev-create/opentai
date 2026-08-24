"use client";

import { CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { deriveModels } from "@/ai/registry/registry";
import { useModelSelection } from "@/features/models/store/ModelSelectionProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";

export function ModelSelector() {
  const toast = useToast();
  const { settings } = useSettings();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const models = useMemo(() => deriveModels(settings), [settings]);

  return (
    <>
      <div className="mb-1.5 mt-5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">โมเดล</div>
      {models.map((m, i) => (
        <div key={m.id} className={`flex items-center justify-between py-2.5 ${i < models.length - 1 ? "border-b border-border" : ""}`}>
          <div>
            <div className="text-[13.5px] font-medium text-text">{m.name}</div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">
              {m.capability} · {m.context}
              {!m.ready ? " · ต้องใช้ API key" : ""}
            </div>
          </div>
          {selectedModel === m.name ? (
            <CircleCheck size={16} className="text-accent" />
          ) : (
            <button
              disabled={!m.ready}
              onClick={() => {
                setSelectedModel(m.name);
                toast(`ตั้ง ${m.name} เป็นค่าเริ่มต้น`);
              }}
              className={`border-0 bg-none text-xs ${m.ready ? "cursor-pointer text-accent" : "cursor-not-allowed text-text-muted"}`}
            >
              เลือก
            </button>
          )}
        </div>
      ))}
    </>
  );
}
