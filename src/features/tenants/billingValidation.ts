import { parseProblemDetail } from "@/lib/api/problem";

/** 서버의 기간·총액 판정을 입력 필드에 연결하고 수정 중인 값은 보존한다. */
export function tenantBillingFieldErrors(error: unknown) {
  const problem = parseProblemDetail(error);
  if (!problem) return [];
  const fieldByProblem = {
    "tenant-one-time-end-date-required": "endDate",
    "tenant-one-time-start-date-immutable": "startDate",
    "tenant-one-time-rent-change-not-allowed": "rentManwon",
    "tenant-billing-history-conflict": "endDate",
    "tenant-contract-date-invalid": "endDate",
    "tenant-billing-cycle-timing-invalid": "billingTiming",
  } as const;
  const code = problem.type.slice(problem.type.lastIndexOf("/") + 1);
  if (!Object.hasOwn(fieldByProblem, code)) return [];
  const name = fieldByProblem[code as keyof typeof fieldByProblem];
  return [{ name, errors: [problem.detail] }];
}
