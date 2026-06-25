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

test("returns null for non-ProblemDetail error", () => {
  expect(parseProblemDetail(new Error("network"))).toBeNull();
});

test("returns null when response data has no title", () => {
  const err = makeAxiosError({ message: "oops" }, 500);
  expect(parseProblemDetail(err)).toBeNull();
});
