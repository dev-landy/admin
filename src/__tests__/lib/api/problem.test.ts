import { AxiosError, AxiosHeaders } from "axios";
import { parseProblemDetail } from "@/lib/api/problem";

function makeAxiosError(data: unknown, status: number): AxiosError {
  const err = new AxiosError("error", undefined, undefined, undefined, {
    data,
    status,
    statusText: "Error",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
  return err;
}

test("parses valid ProblemDetail response", () => {
  const err = makeAxiosError(
    { type: "/problems/user-not-found", title: "Not Found", status: 404, detail: "User 1 not found" },
    404,
  );
  const result = parseProblemDetail(err);
  expect(result).toEqual({ type: "/problems/user-not-found", title: "Not Found", status: 404, detail: "User 1 not found" });
});

test("network 오류와 누락되거나 잘못된 Problem Detail 필드를 거부한다", () => {
  const valid = { type: "/problems/bad-request", title: "Bad Request", status: 400, detail: "잘못된 요청" };
  const invalidErrors = [
    new Error("network"),
    makeAxiosError(undefined, 500),
    makeAxiosError({ message: "oops" }, 500),
    makeAxiosError({ title: "Partial" }, 400),
    makeAxiosError({ type: 42, title: null, status: "404", detail: {} }, 404),
    ...["type", "title", "status", "detail"].map((field) =>
      makeAxiosError({ ...valid, [field]: undefined }, 400)),
    makeAxiosError({ ...valid, status: "400" }, 400),
    makeAxiosError({ ...valid, detail: {} }, 400),
  ];
  for (const error of invalidErrors) expect(parseProblemDetail(error)).toBeNull();
});
