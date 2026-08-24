/**
 * Meson 3.x–8.x categories that aren't text-chat models. Each has its own
 * Studio UI + dedicated /api/meson/* route (see /app/meson/*), not the
 * shared /api/meson/chat text-streaming path — so pickers link out to these
 * pages instead of trying to select them as a chat model.
 *
 * Embedding (7.x) is intentionally excluded: it has no standalone Studio UI
 * (backend/RAG use only), so there's nowhere useful to link to yet.
 */
export interface MesonStudioLink {
  href: string;
  title: string;
  desc: string;
}

export const MESON_STUDIO_LINKS: MesonStudioLink[] = [
  { href: "/meson/image", title: "สร้าง/แก้ไขรูปภาพ", desc: "Meson 3.x" },
  { href: "/meson/live", title: "เสียงสด", desc: "Meson 4.x" },
  { href: "/meson/tts", title: "แปลงข้อความเป็นเสียง", desc: "Meson 5.x" },
  { href: "/meson/video", title: "สร้างวิดีโอ", desc: "Meson 6.0" },
  { href: "/meson/robotics", title: "หุ่นยนต์ / Physical AI", desc: "Meson 8.x" },
];
