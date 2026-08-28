/**
 * Central error model — ThaiAI_Phase2_Prompt.md item 7.
 * Every layer (storage, files, parsers, ai) throws `AppError` with one of
 * these codes instead of a generic `Error`, so the UI can render a message
 * and, where relevant, an action (e.g. "open settings") specific to what
 * actually went wrong.
 */
export type AppErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "MODEL_UNAVAILABLE"
  | "CONTEXT_TOO_LARGE"
  | "FILE_UNSUPPORTED"
  | "FILE_TOO_LARGE"
  | "PARSE_FAILED"
  | "STORAGE_FULL"
  | "OFFLINE"
  | "VISION_UNSUPPORTED"
  | "UNKNOWN";

const MESSAGES_TH: Record<AppErrorCode, string> = {
  PROVIDER_UNAVAILABLE: "เชื่อมต่อผู้ให้บริการ AI ไม่ได้ในขณะนี้",
  INVALID_API_KEY: "API key ไม่ถูกต้องหรือหมดอายุ",
  RATE_LIMITED: "ใช้งานเกินโควตาของผู้ให้บริการ ลองใหม่อีกครั้งภายหลัง",
  MODEL_UNAVAILABLE: "โมเดลนี้ไม่พร้อมใช้งานในขณะนี้",
  CONTEXT_TOO_LARGE: "ข้อมูลบริบท (context) ที่แนบมาใหญ่เกินขนาดที่รองรับ",
  FILE_UNSUPPORTED: "ไม่รองรับไฟล์ประเภทนี้",
  FILE_TOO_LARGE: "ไฟล์มีขนาดใหญ่เกินไป",
  PARSE_FAILED: "แยกวิเคราะห์เนื้อหาไฟล์นี้ไม่สำเร็จ",
  STORAGE_FULL: "พื้นที่จัดเก็บในเบราว์เซอร์เต็ม",
  OFFLINE: "ไม่มีการเชื่อมต่ออินเทอร์เน็ต",
  VISION_UNSUPPORTED: "โมเดลที่เลือกอยู่ไม่รองรับการดูรูปภาพ กรุณาเลือกโมเดลอื่นที่มีสัญลักษณ์รูปภาพ",
  UNKNOWN: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message?: string, cause?: unknown) {
    super(message ?? MESSAGES_TH[code]);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }

  /** Thai, user-facing message. Falls back to the raw message for UNKNOWN. */
  get userMessage(): string {
    return MESSAGES_TH[this.code] ?? this.message;
  }

  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
  }

  /** Normalizes any thrown value into an AppError (defaults to UNKNOWN). */
  static from(err: unknown): AppError {
    if (AppError.isAppError(err)) return err;
    if (err instanceof Error) return new AppError("UNKNOWN", err.message, err);
    return new AppError("UNKNOWN", typeof err === "string" ? err : undefined, err);
  }
}
