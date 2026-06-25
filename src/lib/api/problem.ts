import { AxiosError } from "axios";

export type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

export function parseProblemDetail(error: unknown): ProblemDetail | null {
  if (!(error instanceof AxiosError)) return null;
  const data = error.response?.data;
  if (
    data &&
    typeof data === "object" &&
    typeof (data as Record<string, unknown>).type === "string" &&
    typeof (data as Record<string, unknown>).title === "string" &&
    typeof (data as Record<string, unknown>).status === "number" &&
    typeof (data as Record<string, unknown>).detail === "string"
  ) {
    return data as ProblemDetail;
  }
  return null;
}
