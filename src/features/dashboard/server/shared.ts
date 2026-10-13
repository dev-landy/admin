import type { SourceError } from "../types";

export class AnalyticsError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export function sourceError(error: unknown): SourceError {
  if (error instanceof AnalyticsError) return { status: "error", code: error.code, message: error.message };
  if (error instanceof Error && error.message.startsWith("[env.server] Missing required environment variable:")) {
    return { status: "error", code: "missing_configuration", message: `${error.message.split(":").at(-1)?.trim()} 환경변수가 없습니다. admin/.env.local 또는 배포 환경에 저장한 뒤 서버를 재시작하세요.` };
  }
  return { status: "error", code: "connection_failed", message: "조회 시간이 초과되었거나 연결에 실패했습니다. 네트워크와 서버 설정을 확인하고 다시 시도하세요." };
}
export async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json(); } catch { throw new AnalyticsError("invalid_response", `조회 서버가 JSON 대신 다른 응답을 반환했습니다. (HTTP ${response.status})`); }
}
export function dateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
export function shiftMonth(date: string, months: number): string {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`); value.setUTCMonth(value.getUTCMonth() + months); return value.toISOString().slice(0, 10);
}
export function numeric(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) throw new AnalyticsError("invalid_response", "집계 응답의 수치가 올바르지 않습니다.");
  return Number(value);
}
