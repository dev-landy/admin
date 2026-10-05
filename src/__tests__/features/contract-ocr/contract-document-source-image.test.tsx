import "@/test-utils/antd";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ContractDocumentSourceImage } from "@/features/contract-ocr/components/ContractDocumentSourceImage";

test("원본을 패널 안에서 확대·축소하고 한계를 잠그며 기본 크기로 되돌린다", () => {
  render(<ContractDocumentSourceImage file={{ fileId: "local-original", fileIndex: 0, contentType: "image/png", url: "https://example.test/original.png", expiresAt: "2026-10-06T00:00:00" }} isRefreshing={false} onRefresh={jest.fn()} />);
  const group = within(screen.getByRole("group", { name: "계약서 1페이지 확대 조절" }));
  const increase = group.getByRole("button", { name: "계약서 1페이지 확대" });
  const decrease = group.getByRole("button", { name: "계약서 1페이지 축소" });
  const reset = group.getByRole("button", { name: "계약서 1페이지 기본 크기" });
  const region = screen.getByRole("region", { name: "계약서 1페이지 확대 원본" });
  const canvas = region.firstElementChild;
  expect(region).toHaveAttribute("tabindex", "0");
  expect(canvas).toHaveStyle({ width: "100%" });
  fireEvent.click(increase);
  expect(canvas).toHaveStyle({ width: "125%" });
  expect(group.getByText("125%")).toBeVisible();
  expect(within(region).getByRole("img", { name: "계약서 1페이지" })).toHaveAttribute("src", "https://example.test/original.png");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  for (let index = 0; index < 7; index += 1) fireEvent.click(increase);
  expect(increase).toBeDisabled();
  expect(canvas).toHaveStyle({ width: "250%" });
  for (let index = 0; index < 10; index += 1) fireEvent.click(decrease);
  expect(decrease).toBeDisabled();
  expect(canvas).toHaveStyle({ width: "50%" });
  fireEvent.click(reset);
  expect(canvas).toHaveStyle({ width: "100%" });
  expect(reset).toBeDisabled();
});
