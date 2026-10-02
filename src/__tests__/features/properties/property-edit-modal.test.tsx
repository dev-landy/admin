import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";

import { PropertyEditModal } from "@/features/properties/components/PropertyEditModal";
import "@/test-utils/antd";

const mockUpdate = jest.fn();
const onClose = jest.fn();
jest.mock("@/features/properties/hooks", () => ({ useUpdateProperty: () => ({ mutate: mockUpdate, isPending: false }) }));
const property = { propertyId: 3, name: "건물", address: "기존 주소", activeTenantCount: 0, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

beforeEach(() => jest.clearAllMocks());
async function open() {
  render(<App><PropertyEditModal property={property} onClose={onClose} /></App>);
  const dialog = await screen.findByRole("dialog");
  await waitFor(() => expect(within(dialog).getByLabelText("건물명")).toHaveValue("건물"));
  return dialog;
}

test("주소를 비워도 기존 유지 요청이며 명시 삭제를 고르면 address 없이 clearAddress를 전송한다", async () => {
  const dialog = await open();
  fireEvent.change(within(dialog).getByLabelText("주소"), { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ propertyId: 3, body: { name: "건물", address: null } }, expect.any(Object)));
  mockUpdate.mockClear();
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "주소 삭제" }));
  await waitFor(() => expect(within(dialog).getByLabelText("주소")).toBeDisabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ propertyId: 3, body: { name: "건물", clearAddress: true } }, expect.any(Object)));
});

test("255 Unicode code point는 허용하고 256자는 저장하지 않는다", async () => {
  const dialog = await open();
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "😀".repeat(256) } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(await within(dialog).findByText("255자 이하로 입력해 주세요.")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText("건물명"), { target: { value: "😀".repeat(255) } });
  fireEvent.change(within(dialog).getByLabelText("주소"), { target: { value: "😀".repeat(255) } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ propertyId: 3, body: { name: "😀".repeat(255), address: "😀".repeat(255) } }, expect.any(Object)));
});

test("실패와 취소는 주소 삭제 선택과 입력을 서버에 추가로 쓰지 않는다", async () => {
  const dialog = await open();
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "주소 삭제" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  await act(async () => { mockUpdate.mock.calls[0][1].onError(new Error("network")); });
  expect(within(dialog).getByRole("checkbox", { name: "주소 삭제" })).toBeChecked();
  expect(within(dialog).getByLabelText("건물명")).toHaveValue("건물");
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});
