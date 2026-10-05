import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PagedTable } from "@/components/PagedTable";
import { useAdminViewport } from "@/components/useAdminViewport";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
const viewport = jest.mocked(useAdminViewport);
beforeEach(() => viewport.mockReturnValue("wide"));

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
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(change).toHaveBeenLastCalledWith(3, 20);
  fireEvent.change(screen.getByRole("combobox", { name: /페이지당 항목 수/ }), { target: { value: "50" } });
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

test("중간 화면에서 핵심 열과 추가 정보를 제공하고 모바일 카드에서도 페이지 상태를 유지한다", () => {
  const shared = { dataSource: [{ id: 123, name: "김검색", email: "search@example.test" }], loading: false, page: 2, pageSize: 20, total: 53, onPageChange: jest.fn(), rowKey: "id" as const,
    columns: [{ title: "이름", dataIndex: "name" }, { title: "이메일", dataIndex: "email" }],
    compactColumns: [{ title: "관리 대상", dataIndex: "name" }], renderCompactDetails: (record: { email: string }) => <div>{record.email}</div>,
    renderCard: (record: { id: number; name: string }) => <article aria-label={`유저 #${record.id}`}>{record.name}<button>상세</button></article> };
  viewport.mockReturnValue("compact");
  const view = render(<PagedTable {...shared} />);
  expect(screen.getByRole("columnheader", { name: "관리 대상" })).toBeVisible();
  expect(screen.queryByRole("columnheader", { name: "이메일" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("row", { name: "김검색" }));
  expect(screen.getByText("search@example.test")).toBeVisible();
  viewport.mockReturnValue("mobile");
  view.rerender(<PagedTable {...shared} />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("article", { name: "유저 #123" })).toBeVisible();
  expect(screen.getByText("21–40번째 · 2페이지")).toBeVisible();
  fireEvent.click(screen.getByTitle("다음 페이지"));
  expect(shared.onPageChange).toHaveBeenLastCalledWith(3, 20);
});

test("넓은 화면의 좁은 대화상자에서도 행 버튼을 자르지 않고 카드로 전환한다", () => {
  const measure = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 640, 600));
  try {
    render(<PagedTable columns={[{ title: "작업", render: () => <button>임차인 보기</button> }]} dataSource={[{ id: 10 }]} renderCard={() => <article aria-label="좁은 공간의 건물 #10"><button>임차인 보기</button></article>} loading={false} page={1} pageSize={20} total={1} onPageChange={jest.fn()} rowKey="id" />);
    expect(screen.getByRole("article", { name: "좁은 공간의 건물 #10" })).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "임차인 보기" })).toBeEnabled();
  } finally { measure.mockRestore(); }
});

test("중간 표 행은 해당 기록만 클릭·키보드로 펼치고 넓은 표의 원래 행 동작을 보존한다", () => {
  viewport.mockReturnValue("compact");
  const rowClick = jest.fn();
  const rowKeyDown = jest.fn();
  const props = {
    columns: [{ title: "대상", dataIndex: "name" }, { title: "이메일", dataIndex: "email" }],
    compactColumns: [{ title: "대상", dataIndex: "name", render: (name: string) => <a href="#property-1">{name}</a> }, { title: "작업", key: "actions", render: () => <button>상세</button> }],
    renderCompactDetails: (record: { email: string }) => <span>{record.email}</span>,
    dataSource: [{ id: 1, name: "첫 건물", email: "first@example.test" }, { id: 2, name: "둘째 건물", email: "second@example.test" }],
    loading: false, page: 1, pageSize: 20, total: 2, onPageChange: jest.fn(), rowKey: "id" as const,
    onRow: (record: { name: string }) => ({ onClick: rowClick, onKeyDown: rowKeyDown, "aria-label": `${record.name} 기록`, "aria-describedby": "original-guide", className: "original-row" }),
  };
  const { container, rerender } = render(<PagedTable {...props} />);
  const target = screen.getByRole("link", { name: "첫 건물" }).closest("td")!;
  const row = screen.getByRole("row", { name: "첫 건물 기록" });
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(within(target).queryByRole("button")).not.toBeInTheDocument();
  expect(row).toHaveAttribute("tabindex", "0");
  expect(row).toHaveClass("original-row", "admin-table-clickable-row");
  expect(row.getAttribute("aria-describedby")).toMatch(/^original-guide .+-row-guide$/);
  expect(row).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(target);
  expect(rowClick).not.toHaveBeenCalled();
  expect(row).toHaveAttribute("aria-expanded", "true");
  const panel = container.querySelector(`[id="${row.getAttribute("aria-controls")}"]`)!;
  expect(panel).toHaveTextContent("first@example.test");
  expect(panel).toBeVisible();
  expect(screen.queryByText("second@example.test")).not.toBeInTheDocument();
  fireEvent.keyDown(row, { key: "Enter" });
  expect(row).toHaveAttribute("aria-expanded", "false");
  expect(row).not.toHaveAttribute("aria-controls");
  expect(panel).not.toBeVisible();
  const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  fireEvent(row, space);
  expect(space.defaultPrevented).toBe(true);
  expect(row).toHaveAttribute("aria-expanded", "true");
  expect(rowKeyDown).not.toHaveBeenCalled();
  fireEvent.click(row);
  expect(row).toHaveAttribute("aria-expanded", "false");

  viewport.mockReturnValue("wide");
  rerender(<PagedTable {...props} />);
  const wideRow = screen.getByRole("row", { name: "첫 건물 기록" });
  expect(wideRow).not.toHaveAttribute("aria-expanded");
  expect(wideRow).not.toHaveClass("admin-table-clickable-row");
  fireEvent.click(wideRow);
  fireEvent.keyDown(wideRow, { key: "Enter" });
  expect(rowClick).toHaveBeenCalledTimes(1);
  expect(rowKeyDown).toHaveBeenCalledTimes(1);
});

test("중간 표의 링크·작업·입력·스위치와 편집 영역은 행 펼침을 실행하지 않는다", () => {
  viewport.mockReturnValue("compact");
  const linkClick = jest.fn();
  const action = jest.fn();
  const switchClick = jest.fn();
  render(<PagedTable columns={[]} compactColumns={[{ title: "대상", render: () => <>
    <a href="#property-1" onClick={linkClick}>건물 보기</a><button onClick={action}>수정</button>
    <input aria-label="수정 이름" /><input type="checkbox" aria-label="예약 활성" />
    <span role="switch" aria-label="알림 활성" aria-checked="false" tabIndex={0} onClick={switchClick}>알림</span>
    <div contentEditable suppressContentEditableWarning tabIndex={0}>편집 중 메모</div>
  </> }]} renderCompactDetails={() => "추가 기록"}
    dataSource={[{ id: 1 }]} loading={false} page={1} pageSize={20} total={1} onPageChange={jest.fn()} rowKey="id" />);
  const row = screen.getByRole("link", { name: "건물 보기" }).closest("tr")!;
  const controls = [screen.getByRole("link", { name: "건물 보기" }), screen.getByRole("button", { name: "수정" }),
    screen.getByRole("textbox", { name: "수정 이름" }), screen.getByRole("checkbox", { name: "예약 활성" }),
    screen.getByRole("switch", { name: "알림 활성" }), screen.getByText("편집 중 메모")];
  for (const control of controls) {
    fireEvent.click(control);
    fireEvent.keyDown(control, { key: "Enter" });
    fireEvent.keyDown(control, { key: " " });
    expect(row).toHaveAttribute("aria-expanded", "false");
  }
  expect(linkClick).toHaveBeenCalledTimes(1);
  expect(action).toHaveBeenCalledTimes(1);
  expect(switchClick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("checkbox", { name: "예약 활성" })).toBeChecked();
  expect(screen.queryByText("추가 기록")).not.toBeInTheDocument();
});

test("표의 텍스트를 드래그해 선택한 클릭은 펼치지 않고 선택을 해제한 클릭은 펼친다", () => {
  viewport.mockReturnValue("compact");
  render(<PagedTable columns={[{ title: "대상", dataIndex: "name" }]} renderCompactDetails={() => "추가 기록"}
    dataSource={[{ id: 1, name: "복사할 건물명" }]} loading={false} page={1} pageSize={20} total={1} onPageChange={jest.fn()} rowKey="id" />);
  const text = screen.getByText("복사할 건물명");
  const row = text.closest("tr")!;
  const selection = window.getSelection()!;
  const range = document.createRange(); range.selectNodeContents(text);
  selection.addRange(range);
  try {
    expect(selection.toString()).toBe("복사할 건물명");
    fireEvent.click(text);
    expect(row).toHaveAttribute("aria-expanded", "false");
    selection.removeAllRanges();
    fireEvent.click(text);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("추가 기록")).toBeVisible();
  } finally { selection.removeAllRanges(); }
});

test("화면이 넓어도 전체 열이 실제 목록 폭보다 넓으면 핵심 열과 상세 펼침으로 읽는다", () => {
  const measure = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1000, 600));
  try {
    render(<PagedTable columns={[{ title: "긴 원본 열", width: 1400, dataIndex: "name" }]} compactColumns={[{ title: "핵심 대상", width: 500, dataIndex: "name" }]} renderCompactDetails={() => "추가 기록"} dataSource={[{ id: 10, name: "김검색" }]} loading={false} page={1} pageSize={20} total={1} onPageChange={jest.fn()} rowKey="id" />);
    expect(screen.getByRole("columnheader", { name: "핵심 대상" })).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "긴 원본 열" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("row", { name: "김검색" }));
    expect(screen.getByText("추가 기록")).toBeVisible();
  } finally { measure.mockRestore(); }
});
