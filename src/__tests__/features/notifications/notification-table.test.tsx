import { fireEvent, render, screen, within } from "@testing-library/react";

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
      onFilterChange={jest.fn()}
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

  fireEvent.click(screen.getByRole("row", { name: "알림 #102 상세 보기" }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("2026-08-29T10:00:00")).toBeInTheDocument();
  expect(within(dialog).getByText("본문 정보가 제공되지 않았습니다.")).toBeInTheDocument();
});
