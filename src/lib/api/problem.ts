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
    "title" in data &&
    "type" in data &&
    "status" in data &&
    "detail" in data
  ) {
    return data as ProblemDetail;
  }
  return null;
}
