import "@/test-utils/antd";
import { fireEvent, render, screen } from "@testing-library/react";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { DateFilterDropdown } from "@/components/DateFilterDropdown";

test("ID filter follows externally restored URL value", () => {
  const apply = jest.fn();
  const { rerender } = render(<IdFilterDropdown value={5} placeholder="유저 ID" onApply={apply} />);
  fireEvent.change(screen.getByRole("spinbutton", { name: "유저 ID" }), { target: { value: "99" } });
  rerender(<IdFilterDropdown value={12} placeholder="유저 ID" onApply={apply} />);
  expect(screen.getByRole("spinbutton", { name: "유저 ID" })).toHaveValue("12");
  fireEvent.click(screen.getByRole("button", { name: "적용" }));
  expect(apply).toHaveBeenLastCalledWith(12);
});

test("invalid ID cannot be applied by Enter", () => {
  const apply = jest.fn();
  render(<IdFilterDropdown placeholder="유저 ID" onApply={apply} />);
  const input = screen.getByRole("spinbutton", { name: "유저 ID" });
  fireEvent.input(input, { target: { value: "-5" } });
  expect(screen.getByRole("button", { name: "적용" })).toBeDisabled();
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(apply).not.toHaveBeenCalled();
});

test("date filter clears the old draft after external reset", () => {
  const apply = jest.fn();
  const { rerender } = render(<DateFilterDropdown value="2026-10-04" onApply={apply} />);
  expect(screen.getByRole("textbox", { name: "필터 날짜" })).toHaveValue("2026-10-04");
  rerender(<DateFilterDropdown onApply={apply} />);
  expect(screen.getByRole("textbox", { name: "필터 날짜" })).toHaveValue("");
  expect(apply).not.toHaveBeenCalled();
});

test("날짜 필터를 직접 입력하고 blur 직후 적용하면 새 날짜를 한 번 전달한다", () => {
  const apply = jest.fn();
  render(<DateFilterDropdown value="2026-10-04" onApply={apply} />);
  const input = screen.getByRole("textbox", { name: "필터 날짜" });
  const button = screen.getByRole("button", { name: "적용" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "2026-11-17" } });
  fireEvent.blur(input, { relatedTarget: button });
  fireEvent.click(button);
  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith("2026-11-17");
});
