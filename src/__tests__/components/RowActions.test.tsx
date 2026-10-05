import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, Button, ConfigProvider } from "antd";
import { RowActions } from "@/components/RowActions";

function shell(children: React.ReactNode) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>;
}

test("행의 주요 작업과 보조 링크는 명확한 대상으로 노출되며 행 클릭을 실행하지 않는다", async () => {
  const rowClick = jest.fn(); const primary = jest.fn();
  render(shell(<div onClick={rowClick}><RowActions subject="임차인 #30" primary={<Button onClick={primary}>상세</Button>} items={[{ key: "payments", label: "납부 내역", href: "/payments?tenantId=30&returnTo=%2Ftenants" }]} /></div>));
  fireEvent.click(screen.getByRole("button", { name: "상세" }));
  expect(primary).toHaveBeenCalledTimes(1); expect(rowClick).not.toHaveBeenCalled();
  const more = screen.getByRole("button", { name: "임차인 #30 더보기" });
  fireEvent.click(more);
  await waitFor(() => expect(screen.getByRole("menu")).toBeVisible());
  expect(screen.getByRole("link", { name: "납부 내역" })).toHaveAttribute("href", "/payments?tenantId=30&returnTo=%2Ftenants");
  expect(more).toHaveAttribute("aria-expanded", "true");
  expect(rowClick).not.toHaveBeenCalled();
});

test("삭제 요청 중에는 취소가 잠기고 실패하면 같은 대상 확인을 유지해 재시도할 수 있다", async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, rejectPromise) => { reject = rejectPromise; });
  const remove = jest.fn(() => Promise.resolve()).mockReturnValueOnce(pending);
  render(shell(<RowActions subject="건물 #10" primary={<Button>임차인 보기</Button>} items={[{ key: "delete", label: "건물 삭제", danger: true, onClick: remove, confirm: { title: "건물 #10 삭제", description: "청솔 빌라를 삭제합니다." } }]} />));
  fireEvent.click(screen.getByRole("button", { name: "건물 #10 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  expect(remove).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error("retryable fixture failure")); });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeEnabled());
  expect(dialog).toHaveTextContent("청솔 빌라를 삭제합니다.");
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(remove).toHaveBeenCalledTimes(2);
});

test("삭제 메뉴는 확인 전 실행하지 않고 취소·대상 행 제거 후에는 삭제할 수 없다", async () => {
  const remove = jest.fn();
  const actions = <RowActions subject="건물 #10" primary={<Button>임차인 보기</Button>} items={[{ key: "remove", label: "건물 삭제", danger: true, onClick: remove, confirm: { title: "건물을 삭제하시겠습니까?", description: "건물 #10 · 청솔 빌라를 삭제합니다." } }]} />;
  const view = render(shell(actions));
  fireEvent.click(screen.getByRole("button", { name: "건물 #10 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("건물 #10 · 청솔 빌라");
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "건물 #10 더보기" })).toHaveFocus();
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "건물 #10 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  await screen.findByRole("dialog");
  view.rerender(shell(null));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(remove).not.toHaveBeenCalled();
});
