import "@/test-utils/antd";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { PropertySummary } from "@/features/properties/types";

const mockRendered = jest.fn();
const mockMounted = jest.fn();
let mockSuspend = false;
let mockFailure: Error | null = null;
const mockPending = new Promise<never>(() => {});

jest.mock("next/dynamic", () => {
  const React = jest.requireActual("react");
  return { __esModule: true, default: () => function LoadedOverlay(props: { property?: PropertySummary | null; propertyId?: number | null }) {
    mockRendered(props);
    React.useEffect(() => { mockMounted(); }, []);
    if (mockFailure) throw mockFailure;
    if (mockSuspend) throw mockPending;
    return <div data-testid="loaded-overlay" data-open={Boolean(props.property ?? props.propertyId)} />;
  } };
});

import { DeferredPropertyEditModal, DeferredPropertyTenantsModal } from "@/features/properties/components/DeferredPropertyModals";

const property: PropertySummary = { propertyId: 3, userId: 12, userEmail: "a***@example.com", name: "건물", address: null,
  activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

beforeEach(() => { mockRendered.mockClear(); mockMounted.mockClear(); mockSuspend = false; mockFailure = null; });
afterEach(() => jest.restoreAllMocks());

test.each(["edit", "tenants"])("%s overlay starts only on activation and stays mounted when closed", (kind) => {
  const overlay = (open: boolean) => kind === "edit"
    ? <DeferredPropertyEditModal property={open ? property : null} onClose={jest.fn()} />
    : <DeferredPropertyTenantsModal propertyId={open ? property.propertyId : null} onClose={jest.fn()} />;
  const { rerender } = render(overlay(false));
  expect(mockRendered).not.toHaveBeenCalled();
  rerender(overlay(true));
  expect(screen.getByTestId("loaded-overlay")).toHaveAttribute("data-open", "true");
  expect(mockMounted).toHaveBeenCalledTimes(1);
  rerender(overlay(false));
  expect(screen.getByTestId("loaded-overlay")).toHaveAttribute("data-open", "false");
  expect(mockMounted).toHaveBeenCalledTimes(1);
  rerender(overlay(true));
  expect(mockMounted).toHaveBeenCalledTimes(1);
});

function LoadingHost() {
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  return <><h2>기존 건물 목록</h2><button onClick={() => setEditing(property)}>수정 열기</button>
    <DeferredPropertyEditModal property={editing} onClose={() => setEditing(null)} /></>;
}

test("an unloaded edit dialog announces loading and can be cancelled before code arrives", () => {
  mockSuspend = true;
  const { rerender } = render(<LoadingHost />);
  const trigger = screen.getByRole("button", { name: "수정 열기" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("건물 수정");
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  screen.getByRole("dialog").focus();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  mockSuspend = false;
  rerender(<LoadingHost />);
  expect(screen.getByTestId("loaded-overlay")).toHaveAttribute("data-open", "false");
  expect(trigger).toHaveFocus();
});

test("a failed overlay stays local, can be cancelled and offers an explicit document reload", () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockFailure = new Error("Chunk request failed");
  render(<LoadingHost />);
  fireEvent.click(screen.getByRole("button", { name: "수정 열기" }));
  expect(screen.getByRole("heading", { name: "기존 건물 목록" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("화면을 불러오지 못했습니다.");
  expect(screen.getAllByRole("button", { name: "페이지 새로고침" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(screen.getByRole("dialog")).toHaveClass("ant-zoom-leave");
  const rendersAfterFailure = mockRendered.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "수정 열기" }));
  expect(screen.getByRole("alert")).toHaveTextContent("화면을 불러오지 못했습니다.");
  expect(mockRendered).toHaveBeenCalledTimes(rendersAfterFailure);
});
