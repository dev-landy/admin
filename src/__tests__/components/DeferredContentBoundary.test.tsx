import "@/test-utils/antd";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { lazy, Suspense, useState } from "react";
import { DeferredContentBoundary, DeferredContentError } from "@/components/DeferredContentBoundary";

afterEach(() => jest.restoreAllMocks());

test("a rejected lazy tab preserves the surrounding page, its draft and other tabs", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  let rejectModule: (error: Error) => void = () => {};
  const FailedTab = lazy(() => new Promise<never>((_resolve, reject) => { rejectModule = reject; }));

  function Page() {
    const [draft, setDraft] = useState("");
    const [tab, setTab] = useState("tenants");
    return <><h1>사용자 상세</h1><label>작성 중 메모<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <button onClick={() => setTab("properties")}>건물 목록</button>
      {tab === "tenants" ? <DeferredContentBoundary fallback={<DeferredContentError />}>
        <Suspense fallback={<div role="status">목록을 불러오는 중</div>}><FailedTab /></Suspense>
      </DeferredContentBoundary> : <div>기존 건물 목록</div>}
    </>;
  }

  render(<Page />);
  fireEvent.change(screen.getByRole("textbox", { name: "작성 중 메모" }), { target: { value: "저장 전 입력" } });
  await act(async () => { rejectModule(new Error("Chunk request failed")); });
  expect(screen.getByRole("alert")).toHaveTextContent("목록 화면을 불러오지 못했습니다.");
  expect(screen.getByRole("button", { name: "페이지 새로고침" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "사용자 상세" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "작성 중 메모" })).toHaveValue("저장 전 입력");
  fireEvent.click(screen.getByRole("button", { name: "건물 목록" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByText("기존 건물 목록")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "작성 중 메모" })).toHaveValue("저장 전 입력");
});
