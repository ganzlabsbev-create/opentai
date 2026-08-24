"use client";

import { CircleCheck, CircleDot, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getProvider } from "@/ai/providers";
import { deriveProviders } from "@/ai/registry/registry";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { AppError } from "@/types/errors";

/** Sends a tiny real request through the provider to confirm the key actually works before saving it. */
async function verifyApiKey(providerId: string, apiKey: string): Promise<void> {
  const provider = getProvider(providerId);
  if (!provider) throw new AppError("MODEL_UNAVAILABLE");
  const modelId = provider.models[0]?.id;
  if (!modelId) throw new AppError("MODEL_UNAVAILABLE");
  const gen = provider.generateStream({ messages: [{ role: "user", content: "ping" }], modelId }, apiKey);
  // Pulling just the first chunk is enough to surface INVALID_API_KEY/RATE_LIMITED without waiting for a full reply.
  await gen.next();
}

export function ProviderList() {
  const toast = useToast();
  const { settings, setApiKey, updateSettings } = useSettings();
  const providers = useMemo(() => deriveProviders(settings), [settings]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const connect = async (providerId: string) => {
    if (!keyInput.trim()) return;
    setVerifying(true);
    try {
      await verifyApiKey(providerId, keyInput.trim());
      await setApiKey(providerId, keyInput.trim());
      toast("เชื่อมต่อสำเร็จ");
      setEditingId(null);
      setKeyInput("");
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    } finally {
      setVerifying(false);
    }
  };

  const disconnect = async (providerId: string) => {
    const { [providerId]: _removed, ...rest } = settings.apiKeys;
    await updateSettings({ apiKeys: rest });
    if (settings.defaultProviderId === providerId) {
      await updateSettings({ defaultProviderId: "mock", defaultModelId: "mock-v1" });
    }
    toast("ตัดการเชื่อมต่อแล้ว");
  };

  return (
    <>
      <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">ผู้ให้บริการ</div>
      {providers.map((p) => (
        <div key={p.id} className="border-b border-border py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-medium text-text">{p.name}</span>
                {p.status === "connected" ? (
                  <CircleCheck size={13} className="text-accent" />
                ) : (
                  <CircleDot size={13} className="text-text-muted" />
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-text-muted">{p.desc}</div>
            </div>
            {p.requiresApiKey && (
              <Button
                size="sm"
                variant={p.status === "connected" ? "outline" : "accent"}
                onClick={() => {
                  if (p.status === "connected") {
                    disconnect(p.id);
                  } else {
                    setEditingId(editingId === p.id ? null : p.id);
                    setKeyInput("");
                  }
                }}
              >
                {p.status === "connected" ? "ตัดการเชื่อมต่อ" : "เชื่อมต่อ"}
              </Button>
            )}
          </div>
          {editingId === p.id && (
            <div className="mt-2 flex gap-1.5">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="วาง API key ที่นี่"
                className="flex-1 rounded-md border border-border bg-surface-sunk px-2.5 py-1.5 text-[13px] text-text outline-none"
              />
              <Button size="sm" variant="accent" disabled={verifying || !keyInput.trim()} onClick={() => connect(p.id)}>
                {verifying ? <Loader2 size={14} className="animate-spin" /> : "บันทึก"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
