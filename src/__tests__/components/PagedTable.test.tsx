import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PagedTable } from "@/components/PagedTable";

test("목록 영역의 방향키는 가로 스크롤하고 행 버튼의 방향키는 가로 스크롤하지 않는다", () => {
  const { container } = render(<PagedTable columns={[{ title: "작업", render: () => <button>행 작업</button> }]} dataSource={[{ id: 1 }]} loading={false} page={1} pageSize={20} total={42} onPageChange={jest.fn()} rowKey="id" ariaLabel="유저 목록" />);
  const content = container.querySelector(".ant-table-content")!;
  Object.defineProperties(content, { scrollWidth: { value: 900 }, clientWidth: { value: 300 } });
  fireEvent.keyDown(screen.getByRole("region", { name: /유저 목록/ }), { key: "ArrowRight" });
  const moved = content.scrollLeft;
  expect(moved).toBeGreaterThan(0);
  fireEvent.keyDown(screen.getByRole("button", { name: "행 작업" }), { key: "ArrowLeft" });
  expect(content.scrollLeft).toBe(moved);
  fireEvent.keyDown(screen.getByRole("region", { name: /유저 목록/ }), { key: "ArrowLeft" });
  expect(content.scrollLeft).toBe(0);
  expect(screen.getByText("총 42건")).toBeInTheDocument();
});

test("페이지 이동은 선택 페이지를 보내고 행 수 변경은 1페이지에서 시작한다", async () => {
  const change = jest.fn();
  const view = render(<PagedTable columns={[{ title: "ID", dataIndex: "id" }]} dataSource={[{ id: 1 }]} loading={false} page={2} pageSize={20} total={100} onPageChange={change} rowKey="id" />);
  fireEvent.click(screen.getByTitle("Next Page"));
  expect(change).toHaveBeenLastCalledWith(3, 20);
  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByText("50 / page"));
  await waitFor(() => expect(change).toHaveBeenLastCalledWith(1, 50));
  view.rerender(<PagedTable columns={[]} dataSource={[]} loading={false} page={1} pageSize={50} total={0} onPageChange={change} rowKey="id" emptyText="조건에 맞는 유저가 없습니다. 필터를 초기화해 주세요." />);
  expect(screen.getByText(/조건에 맞는 유저가 없습니다/)).toBeVisible();
});
