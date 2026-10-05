import "@/test-utils/antd";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListSortSelect } from "@/components/ListSortSelect";
import { useListSort } from "@/lib/navigation/useListSort";

const fields = [{ value: "userId", label: "사용자 ID" }, { value: "createdAt", label: "가입일" }];

function Workspace({ initial = "page=3&keyword=검색어&fcmPage=2", scoped = false }: { initial?: string; scoped?: boolean }) {
  const [query, setQuery] = useState(initial);
  const sort = useListSort({ fields, defaultField: "userId", sortKey: scoped ? "tenantSort" : "sort", pageKey: scoped ? "tenantPage" : "page", navigation: {
    query,
    update(changes) {
      const params = new URLSearchParams(query);
      for (const [key, value] of Object.entries(changes)) { if (value === undefined) params.delete(key); else params.set(key, value); }
      setQuery(params.toString());
    },
  } });
  return <><ListSortSelect {...sort.control} label="사용자 목록" /><output aria-label="현재 조건">{query}</output><output aria-label="서버 정렬">{sort.requestParams.sort ?? "기본 정렬"}</output></>;
}

test("정렬 순서와 기준을 바꾸면 검색·다른 하위 목록을 보존하며 첫 페이지부터 서버 조회한다", () => {
  render(<Workspace />);
  expect(screen.getByLabelText("서버 정렬")).toHaveTextContent("기본 정렬");
  fireEvent.change(screen.getByRole("combobox", { name: "사용자 목록 정렬 순서" }), { target: { value: "asc" } });
  let params = new URLSearchParams(screen.getByLabelText("현재 조건").textContent!);
  expect(params.get("page")).toBe("1");
  expect(params.get("keyword")).toBe("검색어");
  expect(params.get("fcmPage")).toBe("2");
  expect(screen.getByLabelText("서버 정렬")).toHaveTextContent("userId,asc");
  fireEvent.change(screen.getByRole("combobox", { name: "사용자 목록 정렬 기준" }), { target: { value: "createdAt" } });
  params = new URLSearchParams(screen.getByLabelText("현재 조건").textContent!);
  expect(params.get("sort")).toBe("createdAt,asc");
});

test("하위 목록의 정렬은 해당 페이지 키만 초기화한다", () => {
  render(<Workspace initial="page=3&tenantPage=4&fcmPage=2&tenantKeyword=김" scoped />);
  fireEvent.change(screen.getByRole("combobox", { name: "사용자 목록 정렬 순서" }), { target: { value: "asc" } });
  const params = new URLSearchParams(screen.getByLabelText("현재 조건").textContent!);
  expect(params.get("page")).toBe("3");
  expect(params.get("tenantPage")).toBe("1");
  expect(params.get("fcmPage")).toBe("2");
  expect(params.get("tenantKeyword")).toBe("김");
  expect(params.get("tenantSort")).toBe("userId,asc");
});

test("지원하지 않는 정렬 URL은 서버에 전달하지 않고 기본 선택으로 표시한다", () => {
  render(<Workspace initial="sort=unknown,sideways" />);
  expect(screen.getByRole("combobox", { name: "사용자 목록 정렬 기준" })).toHaveValue("userId");
  expect(screen.getByRole("combobox", { name: "사용자 목록 정렬 순서" })).toHaveValue("desc");
  expect(screen.getByLabelText("서버 정렬")).toHaveTextContent("기본 정렬");
});
