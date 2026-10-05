let mockViewport: "mobile" | "compact" | "wide" = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; });

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NotificationTable } from "@/features/notifications/components/NotificationTable";
import type { Notification } from "@/features/notifications/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const getComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element: Element): CSSStyleDeclaration => getComputedStyle(element);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const notification: Notification = {
  notificationId: 101,
  userId: 7,
  tenantId: 11,
  title: "점검 안내",
  content: "오늘 오후 2시에 서비스 점검이 진행됩니다.",
  type: "CUSTOM",
  targetDate: "2026-08-29",
  sentAt: "2026-08-29T09:30:00",
  isRead: false,
};

const onFilterChange = jest.fn();

function renderTable(item: Notification = notification) {
  render(
    <NotificationTable
      data={[item]}
      loading={false}
      page={1}
      pageSize={20}
      total={1}
      onPageChange={jest.fn()}
      filters={{}}
      onFilterChange={onFilterChange}
    />,
  );
}

test("알림 row를 클릭하면 본문을 포함한 상세 정보를 표시한다", () => {
  renderTable();

  const row = screen.getByText("점검 안내").closest("tr");
  expect(row).not.toBeNull();
  fireEvent.click(row!);

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("알림 #101")).toBeInTheDocument();
  expect(within(dialog).getByText("오늘 오후 2시에 서비스 점검이 진행됩니다.")).toBeInTheDocument();
  expect(within(dialog).getByText("미읽음")).toBeInTheDocument();
});

test("현재 백엔드 목록 응답에서도 생성일과 본문 누락 상태를 표시한다", () => {
  renderTable({
    notificationId: 102,
    userId: 8,
    tenantId: null,
    title: "계약 만료 안내",
    type: "DUE",
    targetDate: "2026-09-01",
    createdAt: "2026-08-29T10:00:00",
    isRead: true,
  });

  fireEvent.click(screen.getByRole("row", { name: /계약 만료 안내/ }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("2026-08-29 10:00:00")).toBeInTheDocument();
  expect(within(dialog).getByText("본문 정보가 제공되지 않았습니다.")).toBeInTheDocument();
});

test.each([
  ["CONTRACT_EXPIRING", "계약 만료 예정"],
  ["CONTRACT_REGISTERED", "계약 등록 완료"],
  ["CONTRACT_FAILED", "계약 등록 실패"],
] as const)("%s 알림도 유형 필터에서 선택한다", async (type, label) => {
  onFilterChange.mockClear();
  renderTable({ ...notification, type });
  const header = within(document.querySelector("thead")!).getByText("알림").closest("th")!;
  fireEvent.click(header.querySelector(".ant-table-filter-trigger")!);
  const dropdown = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(".ant-table-filter-dropdown");
    if (!element) throw new Error("필터를 여는 중입니다.");
    return element;
  });
  fireEvent.mouseDown(within(dropdown).getByRole("combobox"));
  const selectPopup = await waitFor(() => { const popup = document.querySelector<HTMLElement>(".ant-select-dropdown"); if (!popup) throw new Error("유형 선택 메뉴를 여는 중입니다."); return popup; });
  fireEvent.click(within(selectPopup).getByText(label));
  expect(onFilterChange).toHaveBeenCalledWith("type", type);
});

test("유저 ID 필터에서 입력한 대상만 조회하도록 전달한다", async () => {
  onFilterChange.mockClear();
  renderTable();
  const header = within(document.querySelector("thead")!).getByText("대상").closest("th")!;
  fireEvent.click(header.querySelector(".ant-table-filter-trigger")!);
  const dropdown = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(".ant-table-filter-dropdown");
    if (!element) throw new Error("필터를 여는 중입니다.");
    return element;
  });
  fireEvent.change(within(dropdown).getByRole("spinbutton"), { target: { value: "12" } });
  fireEvent.click(within(dropdown).getByRole("button", { name: "적용" }));
  expect(onFilterChange).toHaveBeenCalledWith("userId", 12);
});

test("현재 연결 정보를 함께 표시하고 알림 발행 시각을 푸시 발송과 구분한다", () => {
  renderTable({ ...notification, userEmail: "담당자@example.test", userPhone: "010-0000-1234", tenantName: "홍검수",
    propertyName: "청솔빌라", roomNumber: "101", createdAt: "2026-08-29T09:20:00" });
  expect(screen.getByText("담당자@example.test")).toBeInTheDocument();
  expect(screen.getByText("수신 유저 전화 010-0000-1234")).toBeInTheDocument();
  expect(screen.getByText("홍검수 · 청솔빌라 101호")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "보기" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("알림 발행 시각")).toBeInTheDocument();
  expect(within(dialog).getByText("2026-08-29 09:30")).toBeInTheDocument();
  expect(within(dialog).getByText("오늘 오후 2시에 서비스 점검이 진행됩니다.")).toBeInTheDocument();
  expect(within(dialog).getByText("010-0000-1234")).toBeInTheDocument();
  expect(within(dialog).queryByText("발송일")).not.toBeInTheDocument();
});


test("모바일 카드는 대상일과 발행 시각을 구분하고 보기에서 본문을 연다", () => {
  mockViewport = "mobile";
  renderTable({ ...notification, userEmail: "owner@example.test", userPhone: "010-1234-5678" });
  expect(document.querySelector(".ant-table-wrapper")).not.toBeInTheDocument();
  const card = within(screen.getByRole("article", { name: "알림 #101" }));
  expect(card.getByText("업무 대상일")).toBeInTheDocument();
  expect(card.getByText("2026-08-29")).toBeInTheDocument();
  expect(card.getByText("알림 발행 시각")).toBeInTheDocument();
  expect(card.getByText("2026-08-29 09:30")).toBeInTheDocument();
  fireEvent.click(card.getByRole("button", { name: "보기" }));
  expect(within(screen.getByRole("dialog")).getByText(notification.content!)).toBeInTheDocument();
});

test("compact 행 클릭은 본문을 펼치고 보기 버튼은 별도 상세 대화상자를 연다", () => {
  mockViewport = "compact";
  renderTable({ ...notification, userPhone: "010-1111-1111", tenantPhone: "010-9999-9999" });
  expect(screen.getByText("수신 유저 연락처 010-1111-1111")).toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
  const row = within(table).getByRole("row", { name: /점검 안내/ });
  fireEvent.click(row);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(within(table).getByText(notification.content!)).toBeInTheDocument();
  expect(within(table).getByText("임차인 연락처")).toBeInTheDocument();
  expect(within(table).getByText("010-9999-9999")).toBeInTheDocument();
  expect(within(table).getAllByRole("button", { name: "보기" })).toHaveLength(1);
  fireEvent.click(row);
  expect(row).toHaveAttribute("aria-expanded", "false");
  expect(within(table).getByText(notification.content!)).not.toBeVisible();
  fireEvent.keyDown(row, { key: "Enter" });
  expect(row).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.keyDown(row, { key: " " });
  expect(row).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(within(row).getByRole("button", { name: "보기" }));
  expect(within(screen.getByRole("dialog")).getByText(notification.content!)).toBeInTheDocument();
  expect(row).toHaveAttribute("aria-expanded", "false");
});
