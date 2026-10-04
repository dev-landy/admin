import { AxiosHeaders, isAxiosError, isCancel } from "axios";

const MAX_RETRY_DELAY_MS = 30_000;
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const TRANSIENT_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"]);

/** 운영 결과는 화면 재진입·브라우저 탭 복귀 때 갱신하고, 일정 주기로 요청하지 않는다. */
export const OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
} as const;

function retryAfterDelay(error: unknown): number | undefined {
  if (!isAxiosError(error) || !error.response) return;
  const headers = error.response.headers;
  const value = headers instanceof AxiosHeaders
    ? headers.get("retry-after")
    : Object.entries(headers ?? {}).find(([name]) => name.toLowerCase() === "retry-after")?.[1];
  if (typeof value !== "string" && typeof value !== "number") return;
  const header = String(value).trim();
  if (!header) return;
  if (/^\d+$/.test(header)) return Number(header) * 1_000;
  // 숫자나 부호가 붙은 잘못된 값은 Date.parse의 관대한 날짜 해석으로 재시도하지 않는다.
  if (!/[a-z]/i.test(header)) return;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

/** 확정적인 요청 오류는 즉시 보여주고, 일시적인 조회 실패만 한 번 더 시도한다. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1 || isCancel(error) || !isAxiosError(error)) return false;
  const status = error.response?.status;
  const transient = status === undefined
    ? error.code === undefined || TRANSIENT_ERROR_CODES.has(error.code)
    : TRANSIENT_HTTP_STATUSES.has(status);
  if (!transient) return false;
  const retryAfter = retryAfterDelay(error);
  // 서버가 긴 대기를 요구하면 조기 요청 대신 오류와 수동 재조회 동선을 제공한다.
  return retryAfter === undefined || retryAfter <= MAX_RETRY_DELAY_MS;
}

export function queryRetryDelay(failureCount: number, error: unknown): number {
  const defaultDelay = Math.min(1_000 * 2 ** failureCount, MAX_RETRY_DELAY_MS);
  return Math.max(defaultDelay, retryAfterDelay(error) ?? 0);
}
