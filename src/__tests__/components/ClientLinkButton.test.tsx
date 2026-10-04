import "@/test-utils/antd";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { NavigationGuardProvider, useUnsavedChanges } from "@/components/NavigationGuard";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => mockPush.mockClear());
afterEach(() => jest.restoreAllMocks());

test("preserves the destination URL and uses a client transition for a normal internal click", () => {
  render(<ClientLinkButton href="/payments/duplicates?page=2">중복 납부 확인</ClientLinkButton>);
  const link = screen.getByRole("link", { name: "중복 납부 확인" });
  expect(link).toHaveAttribute("href", "/payments/duplicates?page=2");
  fireEvent.click(link);
  expect(mockPush).toHaveBeenCalledWith("/payments/duplicates?page=2");
});

test.each([
  [{ ctrlKey: true }, {}],
  [{ metaKey: true }, {}],
  [{ shiftKey: true }, {}],
  [{ altKey: true }, {}],
  [{}, { target: "_blank" }],
  [{}, { download: true }],
])("preserves the browser action for modifier, new-tab and download clicks", (clickProps, linkProps) => {
  render(<ClientLinkButton href="/payments" {...linkProps}>납부 목록</ClientLinkButton>);
  let preventedByComponent = false;
  document.addEventListener("click", (event) => {
    preventedByComponent = event.defaultPrevented;
    // jsdom cannot perform the native navigation whose ownership we assert.
    event.preventDefault();
  }, { once: true });
  fireEvent.click(screen.getByRole("link", { name: "납부 목록" }), clickProps);
  expect(mockPush).not.toHaveBeenCalled();
  expect(preventedByComponent).toBe(false);
});

function DirtyForm() {
  useUnsavedChanges(true);
  return <ClientLinkButton href="/payments">납부 목록</ClientLinkButton>;
}

test("the existing capture guard cancels or approves a client transition with one confirmation", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<NavigationGuardProvider><DirtyForm /></NavigationGuardProvider>);
  fireEvent.click(screen.getByRole("link", { name: "납부 목록" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("link", { name: "납부 목록" }));
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(mockPush).toHaveBeenCalledTimes(1);
});
