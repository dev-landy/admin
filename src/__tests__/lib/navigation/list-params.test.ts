import { detailReturnPath, listDetailPath, listReturnPath, relatedListPath } from "@/lib/navigation/listReturn";
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

test("관계 상세 링크는 사용자 탭·하위 목록 조건과 건물 모달 상태를 보존한다", () => {
  const userPath = `/users/12?${new URLSearchParams({ tab: "tenants", tenantPage: "3", tenantKeyword: "홍길동", returnTo: "/users?page=2" })}`;
  expect(new URL(listDetailPath("/tenants", 7, userPath), "https://landy.internal").searchParams.get("returnTo")).toBe(userPath);
  const propertyPath = "/properties?propertyTenantsId=8&propertyTenantPage=2";
  expect(detailReturnPath(propertyPath, "/tenants")).toBe(propertyPath);
  const payments = new URL(relatedListPath("/payments", { tenantId: 7, from: "2026-10-01", to: "2026-10-01" }, userPath), "https://landy.internal");
  expect(Object.fromEntries(payments.searchParams)).toEqual({ tenantId: "7", from: "2026-10-01", to: "2026-10-01", returnTo: userPath });
});

test.each(["https://evil.example/users/7", "//evil.example/users/7", "/auth/kakao/start", "/users/0", "/users/9007199254740992", "/users/7#x", "/users/%37", "/\\evil.example/users"])("관계 복귀 경로 %s는 알려진 내부 화면 밖으로 이동하지 않는다", (path) => {
  expect(detailReturnPath(path, "/tenants")).toBe("/tenants");
});
