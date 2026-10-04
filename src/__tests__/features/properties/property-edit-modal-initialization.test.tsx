import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider, type ModalProps } from "antd";
import { useState } from "react";
import { PropertyEditModal } from "@/features/properties/components/PropertyEditModal";
import type { UserPropertySummary } from "@/features/properties/types";

let mockFinishOpening: ModalProps["afterOpenChange"];
jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return { ...actual, Modal: (props: ModalProps) => {
    mockFinishOpening = props.afterOpenChange;
    return <actual.Modal {...props} afterOpenChange={undefined} />;
  } };
});
jest.mock("@/features/properties/hooks", () => ({ useUpdateProperty: () => ({ mutate: jest.fn(), isPending: false }) }));

const firstProperty: UserPropertySummary = { propertyId: 3, name: "테스트 건물", address: "기존 주소", activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const secondProperty: UserPropertySummary = { propertyId: 4, name: "다음 건물", address: null, activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

function Host() {
  const [property, setProperty] = useState<UserPropertySummary | null>(null);
  return <ConfigProvider theme={{ token: { motion: false } }}><App>
    <button onClick={() => setProperty(firstProperty)}>첫 건물 수정</button>
    <button onClick={() => setProperty(secondProperty)}>다음 건물 수정</button>
    <PropertyEditModal property={property} onClose={() => setProperty(null)} />
  </App></ConfigProvider>;
}

test("the first form paint contains its values before the opening motion completes", () => {
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: "첫 건물 수정" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("건물명")).toHaveValue("테스트 건물");
  expect(within(dialog).getByLabelText("주소")).toHaveValue("기존 주소");
});

test("fast typing survives a late motion callback and repeated cancel-and-continue", async () => {
  render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: "첫 건물 수정" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "초안 검증" } });
  act(() => mockFinishOpening?.(true));
  expect(within(dialog).getByLabelText("건물명")).toHaveValue("초안 검증");
  for (let count = 0; count < 2; count += 1) {
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "계속 수정" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument());
    expect(within(dialog).getByLabelText("건물명")).toHaveValue("초안 검증");
  }
});

test("closing restores focus and the next record and same-record reopening start new form sessions", async () => {
  render(<Host />);
  const firstTrigger = screen.getByRole("button", { name: "첫 건물 수정" });
  firstTrigger.focus();
  fireEvent.click(firstTrigger);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(firstTrigger).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "다음 건물 수정" }));
  expect(within(screen.getByRole("dialog")).getByLabelText("건물명")).toHaveValue("다음 건물");
  expect(within(screen.getByRole("dialog")).getByLabelText("주소")).toHaveValue("");
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(firstTrigger);
  expect(within(screen.getByRole("dialog")).getByLabelText("건물명")).toHaveValue("테스트 건물");
  expect(within(screen.getByRole("dialog")).getByLabelText("주소")).toHaveValue("기존 주소");
});
