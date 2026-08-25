# Diff: คลังสื่อ (library) + ระบบส่งไฟล์กลับแบบ Claude

## วิธีใช้
แตกไฟล์นี้ทับ path เดิมใน repo `opentai` (โครงสร้างตรงกับ `src/...` อยู่แล้ว)
แล้วรัน:

```
npm install        # เพิ่ม jszip, docx, exceljs, jspdf ใน package.json แล้ว
npm run test        # vitest — ของเดิมควรผ่านหมด (ไม่ได้แตะ core/parsers, core/search, core/diff)
npx tsc --noEmit    # sandbox นี้ไม่มีเน็ต รันไม่ได้ฝั่งผม ต้องเช็คเองรอบนึง
```

## สรุปสิ่งที่ทำ (ไล่ตามพรอมทั้ง 2 อัน)

### พรอมที่ 1 — คลังสื่อ
- `src/types/file.ts` — เพิ่ม `source` / `mediaType`, migrate ของเก่าผ่าน `withFileDefaults()`
  ใน `src/core/storage/files.ts` (ของเก่าไม่มี `source` → fallback "uploaded" ตอน list/get)
- `src/app/library/page.tsx` — หน้าใหม่ 3 แท็บ (รูป/ไฟล์/เสียง), เรียงใหม่สุดก่อน,
  รูปใช้ `URL.createObjectURL` + revoke ตอน unmount/เปลี่ยน dependency (useEffect cleanup)
- `src/components/layout/Drawer.tsx` — เพิ่มเมนู "คลังสื่อ" ต่อจาก "ไฟล์"
- จุดที่เดิม "หายเมื่อออกจากหน้า" (ImageStudio, TtsStudio, useConversation
  ของ image/tts/video ใน chat) ต่อเข้ากับ OPFS+IndexedDB แล้วผ่าน `saveAssistantFile`
  (ดูพรอมที่ 2) — เลยแก้ปัญหานี้ไปพร้อมกันเพราะ 2 พรอมพึ่งพากันอยู่แล้ว

### พรอมที่ 2 — ระบบส่งไฟล์กลับ
- `src/types/chat.ts` — เพิ่ม `MessageAttachment` + `ChatMessage.attachments`
- `src/components/shared/AttachmentCard.tsx` — การ์ดไฟล์แนบ (ไอคอนตามประเภท + ชื่อ +
  ขนาด + ดาวน์โหลด) ใช้ทั้งใน `MessageRow.tsx`
- `src/features/chat/lib/saveAssistantFile.ts` — helper กลาง เขียน OPFS + IndexedDB
  (source: "ai-generated") คืน `{ entry, attachment }`
- ต่อเข้า 4 จุดที่ AI สร้างไฟล์จริง:
  - `useConversation.ts` — image/tts/video จากในแชท (composer "+")
  - `ImageStudio.tsx`, `TtsStudio.tsx` — หน้า Studio เดี่ยว
  - ทุกจุด save แบบ best-effort: ถ้า save ไม่สำเร็จ ของเดิม (mediaUrl inline) ยังทำงานอยู่
- `src/features/chat/lib/generateDocumentFile.ts` — แปลง markdown/text เป็น
  docx/pdf/xlsx ฝั่ง client ล้วนๆ (dynamic import `docx`/`exceljs`/`jspdf` เพราะ lib หนัก)
  เลือกใช้แนวทาง "ฝั่ง client หลังได้ข้อความมา" ตามที่พรอมแนะนำ — ไม่ auto-generate
  ทุกข้อความ แต่เพิ่มปุ่ม "ดาวน์โหลดเป็นไฟล์" (ไอคอน FileDown) ต่อจากปุ่ม copy/retry
  ใน `MessageRow.tsx` ให้เลือกฟอร์แมตเอง — เพราะการรู้ format ล่วงหน้าทุกข้อความไม่มีทางรู้ได้
  จาก UI ปัจจุบันโดยไม่เพิ่ม tool ใหม่ทั้งกระบวนคุยกับ format-picker ในcomposer (ถ้าอยากได้
  แบบ auto-tool เหมือน image/tts/video บอกได้ จะแยกพรอมทำต่อ)
- `src/features/projects/lib/exportProjectZip.ts` — jszip, 1 โฟลเดอร์ตามชื่อโปรเจกต์,
  กันชื่อไฟล์ซ้ำ, มี `onLargeExport` callback เตือนก่อน (ต่อเข้า `window.confirm` ใน
  `ProjectWorkspace.tsx` เมื่อรวมเกิน 200MB) + ปุ่ม "ดาวน์โหลดทั้งโปรเจกต์เป็น zip"
- `core/backup/index.ts` — **ไม่ต้องแก้** เช็คแล้วจริงตามที่พรอมบอก: `listFiles()` /
  `putFileRecord()` เป็น generic บน `FileEntry` อยู่แล้ว field ใหม่ (`source`/`mediaType`)
  เลยติดไปกับ backup export/import โดยอัตโนมัติ

## ที่ยังไม่ได้ทำ / ตัดสินใจเอง
- Step 4 ของพรอม 2 ("ถามก่อนว่าจะ generate เอกสารฝั่งไหน") — เลือกฝั่ง client เอง
  ตามที่พรอมแนะนำไว้เป็นตัวเลือกแรก ไม่ได้หยุดถามเพราะสั่งให้ทำรวดเดียว
- Video (`/api/meson/video`) เซฟเข้าคลังได้เฉพาะกรณีที่ API ส่ง base64 กลับมาตรงๆ
  (ตาม `ExtractedVideoMedia.base64`) — ถ้าเป็น `uri` (ลิงก์ไฟล์บนเซิร์ฟเวอร์อื่น) ไม่ได้ fetch
  มาเก็บซ้ำ เพราะจะกลายเป็นการดึงไฟล์ผ่านเน็ตเข้ามาเก็บ ซึ่งขัดกับ "ทุกอย่างฝั่ง client เท่านั้น"
  ที่พรอมเน้นย้ำ — ถ้าอยากให้ดึงมาเก็บด้วยบอกได้
- ไม่ได้รัน `npm install` / `tsc --noEmit` / `next build` เพราะ sandbox นี้ไม่มีเน็ต
  (ไม่มี node_modules เลยด้วย) — โค้ดเขียนตาม convention เดิมของโปรเจกต์แล้วแต่ต้อง
  เช็ค type จริงที่เครื่องคุณอีกที โดยเฉพาะจุดที่พึ่ง `noUncheckedIndexedAccess`
