"use client";

import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { SettingsRow, SettingsSectionLabel } from "@/features/settings/components/SettingsRow";
import { useConversations } from "@/features/chat/store/ConversationsProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { exportBackupBlob, importBackup } from "@/core/backup";
import { formatBytes } from "@/lib/format";
import { AppError } from "@/types/errors";

export function SettingsSections() {
  const toast = useToast();
  const { settings, updateSettings, clearApiKeys, resetApp } = useSettings();
  const { clearAllHistory } = useConversations();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageUsage({ usage: est.usage ?? 0, quota: est.quota ?? 0 });
      });
    }
  }, []);

  const handleClearHistory = () => {
    if (window.confirm("ล้างประวัติแชททั้งหมด? การกระทำนี้ย้อนกลับไม่ได้")) clearAllHistory();
  };

  const handleClearApiKeys = () => {
    if (window.confirm("ล้าง API keys ที่บันทึกไว้ทั้งหมด?")) clearApiKeys();
  };

  const handleReset = () => {
    if (window.confirm("รีเซ็ตแอปทั้งหมด — ลบแชท โปรเจกต์ ไฟล์ และการตั้งค่าทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้")) resetApp();
  };

  const handleExport = async () => {
    try {
      const blob = await exportBackupBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thaiai-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("ส่งออกข้อมูลแล้ว");
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = await importBackup(text);
      toast(`นำเข้าแล้ว: ${result.conversations} แชท, ${result.projects} โปรเจกต์, ${result.files} ไฟล์`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    }
  };

  const usagePct = storageUsage && storageUsage.quota > 0 ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100) : 0;

  return (
    <div>
      <SettingsSectionLabel>ทั่วไป</SettingsSectionLabel>
      <SettingsRow label="ภาษา">
        <span className="text-[13px] text-text-muted">ไทย</span>
      </SettingsRow>
      <SettingsRow label="ขนาดตัวอักษร">
        <button
          onClick={() => updateSettings({ fontSize: settings.fontSize === "normal" ? "large" : "normal" })}
          className="border-0 bg-none text-[13px] text-accent"
        >
          {settings.fontSize === "normal" ? "ปกติ" : "ใหญ่"}
        </button>
      </SettingsRow>

      <SettingsSectionLabel>AI</SettingsSectionLabel>
      <SettingsRow label="การจัดเส้นทางอัตโนมัติ" desc="สลับ provider เมื่อ quota หมด">
        <Toggle checked={settings.autoRouting} onChange={(v) => updateSettings({ autoRouting: v })} />
      </SettingsRow>

      <SettingsSectionLabel>ความเป็นส่วนตัว</SettingsSectionLabel>
      <SettingsRow label="โหมด local-only" desc="ไม่เชื่อมต่อ provider ภายนอก (ใช้ Mock Provider เท่านั้น)">
        <Toggle checked={settings.localOnly} onChange={(v) => updateSettings({ localOnly: v })} />
      </SettingsRow>
      <SettingsRow label="ล้างประวัติแชท">
        <Button size="sm" variant="danger" onClick={handleClearHistory}>
          ล้าง
        </Button>
      </SettingsRow>
      <SettingsRow label="ล้าง API keys">
        <Button size="sm" variant="danger" onClick={handleClearApiKeys}>
          ล้าง
        </Button>
      </SettingsRow>

      <SettingsSectionLabel>พื้นที่จัดเก็บ</SettingsSectionLabel>
      <SettingsRow
        label="พื้นที่ที่ใช้ไป"
        desc={storageUsage ? `${formatBytes(storageUsage.usage)} จาก ${formatBytes(storageUsage.quota)}` : "กำลังตรวจสอบ..."}
      >
        <div className="h-[5px] w-[90px] overflow-hidden rounded-full bg-surface-elevated">
          <div className="h-full bg-accent" style={{ width: `${usagePct}%` }} />
        </div>
      </SettingsRow>

      <SettingsSectionLabel>ขั้นสูง</SettingsSectionLabel>
      <SettingsRow label="ส่งออกข้อมูล" desc="ดาวน์โหลดแชท โปรเจกต์ ไฟล์ และการตั้งค่าเป็น JSON">
        <Button size="sm" variant="outline" icon={Download} onClick={handleExport}>
          ส่งออก
        </Button>
      </SettingsRow>
      <SettingsRow label="นำเข้าข้อมูล" desc="แทนที่ข้อมูลปัจจุบันด้วยไฟล์ backup">
        <Button size="sm" variant="outline" icon={Upload} onClick={() => importInputRef.current?.click()}>
          นำเข้า
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleImportFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </SettingsRow>
      <SettingsRow label="โหมดนักพัฒนา">
        <Toggle checked={settings.devMode} onChange={(v) => updateSettings({ devMode: v })} />
      </SettingsRow>
      <SettingsRow label="รีเซ็ตแอป">
        <Button size="sm" variant="danger" onClick={handleReset}>
          รีเซ็ต
        </Button>
      </SettingsRow>
    </div>
  );
}
