import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, Button, ConfigProvider } from "antd";
import { PagedTable } from "@/components/PagedTable";
import { RowActions } from "@/components/RowActions";
import { useAdminViewport } from "@/components/useAdminViewport";

jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
const viewport = jest.mocked(useAdminViewport);
test("확인 중 화면 크기가 바뀌어도 원래 대상과 진행 상태를 유지하고 삭제 실패를 재시도한다", async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, fail) => { reject = fail; });
  const remove = jest.fn(() => Promise.resolve()).mockReturnValueOnce(pending);
  const action = () => <RowActions subject="건물 #10" primary={<Button>임차인 보기</Button>} items={[{ key: "delete", label: "건물 삭제", danger: true, onClick: remove, confirm: { title: "청솔 #10 삭제" } }]} />;
  function Collection({ records = [{ id: 10 }] }: { records?: { id: number }[] }) {
    return <ConfigProvider theme={{ token: { motion: false } }}><App><PagedTable columns={[{ title: "작업", render: action }]} renderCard={() => <article>{action()}</article>} dataSource={records} loading={false} page={1} pageSize={20} total={records.length} onPageChange={jest.fn()} rowKey="id" /></App></ConfigProvider>;
  }
  viewport.mockReturnValue("wide");
  const view = render(<Collection />);
  fireEvent.click(screen.getByRole("button", { name: "건물 #10 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled());
  viewport.mockReturnValue("mobile");
  view.rerender(<Collection />);
  expect(screen.getByRole("article")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveTextContent("청솔 #10 삭제");
  expect(remove).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error("fixture failure")));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(remove).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "건물 #10 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "건물 삭제" }));
  await screen.findByRole("dialog");
  view.rerender(<Collection records={[]} />);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(remove).toHaveBeenCalledTimes(2);
});
