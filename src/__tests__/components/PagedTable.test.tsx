import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

test("새 조건을 조회하는 동안 완료된 목록 높이는 유지하고 이전 행과 빈 결과 안내는 표시하지 않는다", () => {
  const originalObserver = global.ResizeObserver;
  const measure = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 620));
  let notify: ResizeObserverCallback | undefined;
  global.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { notify = callback; }
    observe() {} unobserve() {} disconnect() {}
  };
  try {
    const shared = { columns: [{ title: "ID", dataIndex: "id" }], pageSize: 20, onPageChange: jest.fn(), rowKey: "id" as const, emptyText: "조건에 맞는 결과가 없습니다." };
    const view = render(<PagedTable {...shared} dataSource={[{ id: 123 }]} loading={false} page={1} total={40} />);
    const region = screen.getByRole("region");
    measure.mockReturnValue(new DOMRect(0, 0, 800, 740));
    act(() => notify?.([], {} as ResizeObserver));
    view.rerender(<PagedTable {...shared} dataSource={[]} loading page={2} total={0} />);
    expect(region).toHaveStyle({ minHeight: "740px" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("123")).not.toBeInTheDocument();
    expect(screen.queryByText("조건에 맞는 결과가 없습니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("목록을 불러오는 중입니다.");
    expect(screen.queryByText("총 0건")).not.toBeInTheDocument();
    view.rerender(<PagedTable {...shared} dataSource={[]} loading page={2} total={40} />);
    expect(screen.getByText("조회 중...")).toBeVisible();
    expect(screen.queryByText("총 40건")).not.toBeInTheDocument();

    view.rerender(<PagedTable {...shared} dataSource={[]} loading={false} page={2} total={0} />);
    expect(region.style.minHeight).toBe("");
    expect(screen.getByText("조건에 맞는 결과가 없습니다.")).toBeVisible();
  } finally {
    global.ResizeObserver = originalObserver;
    measure.mockRestore();
  }
});
