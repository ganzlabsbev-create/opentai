# สรุปการแก้ไข — GitHub Login (2 tier) + Pollinations + Puter

แตกไฟล์นี้ทับ (merge) เข้าไปใน repo เดิมตาม path เดิมได้เลย — โครงสร้างโฟลเดอร์
ในซิปนี้ตรงกับ `src/...` ของ repo ตัวจริง

## ใหม่ (9 ไฟล์)
- `src/auth.ts` — Auth.js (NextAuth v5) config, GitHub provider, JWT session,
  แนบ `githubId` เข้า session
- `src/types/next-auth.d.ts` — module augmentation เพิ่ม `githubId` เข้า Session type
- `src/app/api/auth/[...nextauth]/route.ts` — route handler มาตรฐานของ Auth.js
- `src/features/auth/store/AuthSessionProvider.tsx` — client wrapper รอบ
  `SessionProvider` ให้ root layout (server component) ใช้ได้
- `src/features/auth/components/GithubAccountRow.tsx` — ปุ่ม
  เข้าสู่ระบบ/ออกจากระบบ GitHub ใน Settings
- `src/ai/meson/providers/pollinations-chat.ts` — chat proxy สำหรับ
  Pollinations (reuse `createOpenAICompatChatProxy` เหมือน Mistral)
- `src/features/puter/usePuterChat.ts` — hook เรียก `puter.ai.chat()` ฝั่ง
  client ล้วน + fallback ไป `/api/meson/chat` เมื่อ Puter error
- `src/features/puter/PuterSignInButton.tsx` — ปุ่ม "Sign in with Puter"
  แยกอิสระจาก GitHub Login

## แก้ (11 ไฟล์)
- `src/ai/meson/types.ts` — เพิ่ม `"pollinations"` เข้า `MesonProviderId` + label
- `src/ai/meson/rate-limit.ts` — `checkAndConsumeSharedKeyQuota` รับ
  `(scopeKey, limit)` แทน hardcode IP/20 เดิม
- `src/ai/meson/key-resolution.ts` — เช็ค session ผ่าน `auth()` ก่อนเลือก
  scope: `gh:{githubId}` (25/วัน) หรือ `ip:{ip}` (15/วัน) — แยกตัวนับเสมอ,
  เพิ่ม `pollinations` เข้า `PROVIDER_ENV`/label
- `src/ai/meson/registry.config.ts` — เพิ่ม Meson 1.11–1.13 (chat) และ
  2.3–2.4 (pro) ผูกกับ Pollinations — **ไม่มี DeepSeek** ตามกฎที่ตั้งไว้
  (ยืนยัน model id ปัจจุบันจาก Pollinations API docs ตอน implement จริง)
- `src/ai/meson/availability.ts` — เพิ่ม live model-list fetcher สำหรับ
  Pollinations (`GET /v1/models`, shape เดียวกับ Mistral)
- `src/ai/meson/providers/index.ts` — เพิ่ม `pollinations` เข้า `CHAT_PROXIES`
- `src/app/api/meson/models/route.ts` — ส่ง `POLLINATIONS_API_KEY` เข้า
  availability check ด้วย
- `src/ai/providers/meson.ts` — อัปเดตข้อความ desc เป็น "15/25 ครั้ง/วัน"
- `src/app/layout.tsx` — wrap ด้วย `AuthSessionProvider` + โหลด Puter script
  (`next/script`, `strategy="lazyOnload"`)
- `src/features/settings/components/SettingsSections.tsx` — เพิ่ม section
  "บัญชี" ด้านบนสุด (GitHub row + Puter button)
- `.env.example` — เพิ่ม `AUTH_SECRET`, `AUTH_GITHUB_ID`,
  `AUTH_GITHUB_SECRET`, `AUTH_URL`, `POLLINATIONS_API_KEY`
- `package.json` — เพิ่ม dependency `next-auth@5.0.0-beta.32`

## สิ่งที่ต้องทำเองก่อนใช้งานจริง
1. `npm install` เพื่อดึง `next-auth` เข้ามา (ไม่ได้รันให้ในนี้ เพราะ sandbox
   ไม่มี network — ควรรัน `npm run build`/`tsc --noEmit` เช็คอีกรอบก่อน deploy)
2. สร้าง GitHub OAuth App → ใส่ `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` บน Vercel
3. สมัคร Pollinations ที่ enter.pollinations.ai (ด้วย GitHub ของเจ้าของเว็บ) →
   สร้าง `sk_...` token → ใส่ `POLLINATIONS_API_KEY`
4. เช็ค live model id ของ Pollinations อีกครั้งก่อน deploy จริง (list เปลี่ยนบ่อย
   ตามที่ระบุในแผนเดิม) — ตอนเขียนโค้ดนี้ยืนยันจาก Pollinations API docs แล้วว่า
   `openai-fast`, `openai`, `openai-large`, `qwen-coder`, `grok` มีอยู่จริงและไม่ใช่ DeepSeek
5. รัน Testing checklist เดิมจากแผนงาน (7 ข้อ) หลัง deploy
