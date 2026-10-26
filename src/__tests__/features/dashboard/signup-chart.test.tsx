import { fireEvent, render, screen, within } from "@testing-library/react";
import { SignupChart } from "@/features/dashboard/components/SignupChart";

const points = [
  { date: "2026-10-19", count: 2 },
  { date: "2026-10-20", count: 0 },
  { date: "2026-10-21", count: 4 },
  { date: "2026-10-22", count: 1 },
  { date: "2026-10-23", count: 8 },
  { date: "2026-10-24", count: 3 },
  { date: "2026-10-25", count: 11 },
];

test("selects the latest day initially and marks today's count as ongoing", () => {
  render(<SignupChart points={points} today="2026-10-25" />);

  expect(screen.getAllByRole("button")).toHaveLength(7);
  expect(screen.getByRole("button", { name: /2026-10-25.*11명.*집계 중/ })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.25");
  expect(screen.getByRole("status")).toHaveTextContent("11명");
  expect(within(screen.getByRole("status")).getByText(/집계 중/)).toBeVisible();
});

test("hovering a day updates its selected state and the visible detail", () => {
  render(<SignupChart points={points} today="2026-10-25" />);

  const day = screen.getByRole("button", { name: /2026-10-21.*4명/ });
  fireEvent.pointerEnter(day);

  expect(day).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /2026-10-25.*11명/ })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.21");
  expect(screen.getByRole("status")).toHaveTextContent("4명");
  expect(within(screen.getByRole("status")).queryByText(/집계 중/)).not.toBeInTheDocument();
});

test("a tap or click selects a zero-count day without treating it as missing", () => {
  render(<SignupChart points={points} today="2026-10-25" />);

  const day = screen.getByRole("button", { name: /2026-10-20.*0명/ });
  fireEvent.click(day);

  expect(day).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.20");
  expect(screen.getByRole("status")).toHaveTextContent("0명");
});

test("keyboard focus exposes the same date detail as pointer selection", () => {
  render(<SignupChart points={points} today="2026-10-25" />);

  const day = screen.getByRole("button", { name: /2026-10-23.*8명/ });
  fireEvent.focus(day);

  expect(day).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.23");
  expect(screen.getByRole("status")).toHaveTextContent("8명");
});

test("arrow keys and Home/End move both the selected day and keyboard focus", () => {
  render(<SignupChart points={points} today="2026-10-25" />);
  const latest = screen.getByRole("button", { name: /2026-10-25.*11명/ });
  const previous = screen.getByRole("button", { name: /2026-10-24.*3명/ });
  const first = screen.getByRole("button", { name: /2026-10-19.*2명/ });

  fireEvent.keyDown(latest, { key: "ArrowLeft" });
  expect(previous).toHaveFocus();
  expect(previous).toHaveAttribute("aria-pressed", "true");
  fireEvent.keyDown(previous, { key: "ArrowRight" });
  expect(latest).toHaveFocus();
  fireEvent.keyDown(latest, { key: "Home" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: "ArrowLeft" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: "End" });
  expect(latest).toHaveFocus();
});

test("inspection shows a tooltip for zero days and dismisses it on Escape or pointer exit", () => {
  render(<SignupChart points={points} today="2026-10-25" />);
  const zero = screen.getByRole("button", { name: /2026-10-20.*0명/ });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

  fireEvent.pointerEnter(zero);
  expect(screen.getByRole("tooltip")).toHaveTextContent("2026.10.20");
  expect(screen.getByRole("tooltip")).toHaveTextContent("0명");
  expect(zero).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  fireEvent.keyDown(zero, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

  fireEvent.click(zero);
  expect(screen.getByRole("tooltip")).toHaveTextContent("0명");
  fireEvent.pointerLeave(screen.getByRole("group", { name: "날짜별 가입자 선택" }), { pointerType: "touch" });
  expect(screen.getByRole("tooltip")).toHaveTextContent("0명");
  fireEvent.pointerLeave(screen.getByRole("group", { name: "날짜별 가입자 선택" }));
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(zero).toHaveAttribute("aria-pressed", "true");
});

test("changing periods clears the previous period's tooltip", () => {
  const { rerender } = render(<SignupChart points={points} today="2026-10-25" />);
  fireEvent.focus(screen.getByRole("button", { name: /2026-10-21.*4명/ }));
  expect(screen.getByRole("tooltip")).toHaveTextContent("2026.10.21");

  rerender(<SignupChart points={[{ date: "2026-10-18", count: 7 }]} today="2026-10-25" />);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.18");
});

test("switching periods selects the new latest day and refreshed counts stay current", () => {
  const { rerender } = render(<SignupChart points={points} today="2026-10-25" />);
  fireEvent.click(screen.getByRole("button", { name: /2026-10-21.*4명/ }));

  rerender(<SignupChart points={[
    { date: "2026-10-17", count: 5 },
    { date: "2026-10-18", count: 7 },
  ]} today="2026-10-25" />);

  expect(screen.getByRole("button", { name: /2026-10-18.*7명/ })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("2026.10.18");
  expect(screen.getByRole("status")).toHaveTextContent("7명");

  rerender(<SignupChart points={[
    { date: "2026-10-17", count: 5 },
    { date: "2026-10-18", count: 9 },
  ]} today="2026-10-25" />);

  expect(screen.getByRole("status")).toHaveTextContent("9명");
});

test("an all-zero period still exposes every day and an explicit empty-activity message", () => {
  render(<SignupChart points={points.map(point => ({ ...point, count: 0 }))} today="2026-10-25" />);

  expect(screen.getAllByRole("button", { name: /신규 가입 0명/ })).toHaveLength(7);
  expect(screen.getByRole("status")).toHaveTextContent("0명");
  expect(screen.getByText("이 기간에 신규 가입자가 없습니다.")).toBeVisible();
});

test("an empty set of points does not fabricate a selected day or a count", () => {
  render(<SignupChart points={[]} today="2026-10-25" />);

  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByText("표시할 가입 데이터가 없습니다.")).toBeVisible();
});
