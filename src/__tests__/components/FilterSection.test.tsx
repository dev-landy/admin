import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Button, Form, Input } from "antd";
import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";

test("조회 후에도 기본 조건과 입력·조회 버튼의 포커스를 유지한다", async () => {
  const submit = jest.fn();
  render(<FilterSection><Form onFinish={submit} initialValues={{ keyword: "검색 초안" }}>
    <Form.Item name="keyword" label="검색어"><Input /></Form.Item>
    <Button htmlType="submit">조회</Button>
  </Form></FilterSection>);
  const keyword = screen.getByLabelText("검색어");
  const query = screen.getByRole("button", { name: "조회" });
  expect(keyword).toBeVisible();
  expect(screen.queryByText("검색 조건", { exact: true })).not.toBeInTheDocument();
  query.focus();
  fireEvent.click(query);
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ keyword: "검색 초안" }));
  expect(keyword).toBeVisible();
  expect(keyword).toHaveValue("검색 초안");
  expect(query).toHaveFocus();
});

test("숨긴 상세 조건의 오류를 펼치고 수정한 입력을 접기·다시 펼치기·조회 후에도 유지한다", async () => {
  const submit = jest.fn();
  const view = render(<FilterSection><Form onFinish={submit} initialValues={{ keyword: "검색 초안", id: "invalid" }}>
    <Form.Item name="keyword" label="검색어"><Input /></Form.Item>
    <FilterMore><Form.Item name="id" label="정확한 ID" rules={[{ pattern: /^\d+$/, message: "숫자 ID를 입력하세요." }]}><Input /></Form.Item></FilterMore>
    <Button htmlType="submit">조회</Button>
  </Form></FilterSection>);
  const optional = view.container.querySelector<HTMLDetailsElement>(".admin-filter-more")!;
  const summary = optional.querySelector("summary")!;
  expect(optional.open).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(optional.open).toBe(true));
  await waitFor(() => expect(screen.getByText("숫자 ID를 입력하세요.")).toBeVisible());
  expect(submit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("정확한 ID"), { target: { value: "123" } });
  fireEvent.click(summary);
  await waitFor(() => expect(optional.open).toBe(false));
  expect(screen.getByLabelText("검색어")).toBeVisible();
  fireEvent.click(summary);
  await waitFor(() => expect(optional.open).toBe(true));
  expect(screen.getByLabelText("정확한 ID")).toHaveValue("123");
  fireEvent.click(summary);
  await waitFor(() => expect(optional.open).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ keyword: "검색 초안", id: "123" }));
  expect(screen.getByLabelText("검색어")).toBeVisible();
  expect(screen.getByLabelText("검색어")).toHaveValue("검색 초안");
  expect(optional.open).toBe(false);
  fireEvent.click(summary);
  await waitFor(() => expect(optional.open).toBe(true));
  expect(screen.getByLabelText("정확한 ID")).toHaveValue("123");
});
