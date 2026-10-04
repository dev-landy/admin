import { listDetailPath, listReturnPath } from "@/lib/navigation/listReturn";
import { optionalDate, optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";

test.each(["0", "-1", "NaN", "Infinity", "1.5", "1e3", "9007199254740992", "101"])("invalid page size %s uses the default", (value) => {
  expect(positiveInteger(value, 20, 100)).toBe(20);
});

test("pagination and ID filters accept only positive integers", () => {
  expect(positiveInteger("50", 20, 100)).toBe(50);
  expect(optionalPositiveInteger("123")).toBe(123);
  expect(optionalPositiveInteger("0")).toBeUndefined();
  expect(optionalPositiveInteger("Infinity")).toBeUndefined();
});

test("date filters reject malformed or impossible calendar dates", () => {
  expect(optionalDate("2026-02-30")).toBeUndefined();
  expect(optionalDate("2026-1-01")).toBeUndefined();
  expect(optionalDate("2024-02-29")).toBe("2024-02-29");
});

test("detail links retain the matching list query", () => {
  const path = listDetailPath("/users", 7, "/users?page=3&role=ADMIN");
  expect(new URLSearchParams(path.split("?")[1]).get("returnTo")).toBe("/users?page=3&role=ADMIN");
  expect(listReturnPath("/users?page=3&role=ADMIN", "/users")).toBe("/users?page=3&role=ADMIN");
});

test.each(["https://evil.example/users", "//evil.example/users", "/users/7", "/tenants", "/users#x", "/\\evil.example/users"])("return path %s cannot leave the matching list", (value) => {
  expect(listReturnPath(value, "/users")).toBe("/users");
});
