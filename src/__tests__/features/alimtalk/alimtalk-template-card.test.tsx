import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import type { AlimtalkTemplate, RemoteAlimtalkTemplate } from "@/features/alimtalk/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const APPROVED_BODY = "#{세대정보} 임대료 #{납부액}원의 납부일입니다.";

const template: AlimtalkTemplate = {
  type: "DUE",
  pfId: "KA01PF",
  templateId: "KA01TP",
  body: "예전 문구입니다.",
  enabled: true,
  sendable: true,
  updatedAt: "2026-09-18T08:20:11.123456",
};

const remote: RemoteAlimtalkTemplate = {
  type: "DUE",
  templateId: "KA01TP",
  name: "납부일 안내",
  status: "APPROVED",
  content: APPROVED_BODY,
  variableNames: ["#{세대정보}", "#{납부액}"],
  storedBodyMatches: false,
};

const mockUpdate = jest.fn();
let remoteEnabledCalls: boolean[] = [];

jest.mock("@/features/alimtalk/hooks", () => ({
  useUpdateAlimtalkTemplate: () => ({ mutate: mockUpdate, isPending: false }),
  useRemoteAlimtalkTemplate: (_type: string, enabled: boolean) => {
    remoteEnabledCalls.push(enabled);
    return { data: enabled ? remote : undefined, isFetching: false, error: null };
  },
}));

beforeEach(() => {
  mockUpdate.mockReset();
  remoteEnabledCalls = [];
});

test("화면 진입만으로는 공급자 승인 템플릿을 부르지 않는다", () => {
  render(<AlimtalkTemplateCard template={template} />);

  expect(remoteEnabledCalls.every((enabled) => !enabled)).toBe(true);
  expect(screen.queryByText("공급자 승인 템플릿")).not.toBeInTheDocument();
});

test("본문 사본이 승인 본문과 다르면 경고하고 가져올 수 있게 한다", async () => {
  render(<AlimtalkTemplateCard template={template} />);

  fireEvent.click(screen.getByRole("button", { name: "납부일 안내 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "승인 템플릿 조회" }));

  await screen.findByText(
    "본문 사본이 승인 본문과 다릅니다 — 임대인 미리보기가 실제 발송과 어긋납니다.",
  );

  fireEvent.click(screen.getByRole("button", { name: "승인 본문 가져오기" }));
  expect(screen.getByLabelText("본문 사본")).toHaveValue(APPROVED_BODY);
});

test("저장은 채널·템플릿·본문·사용 여부를 함께 보낸다", async () => {
  render(<AlimtalkTemplateCard template={template} />);

  fireEvent.change(screen.getByLabelText("채널 ID (pfId)"), { target: { value: "KA01PF_NEW" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      {
        type: "DUE",
        body: {
          pfId: "KA01PF_NEW",
          templateId: "KA01TP",
          body: "예전 문구입니다.",
          enabled: true,
        },
      },
      expect.any(Object),
    );
  });
});

test("발송 불가 상태는 이유와 복구 조회를 직접 제공하며 조회 전에는 공급자를 부르지 않는다", async () => {
  render(<AlimtalkTemplateCard template={{ ...template, sendable: false, enabled: false }} />);

  expect(screen.getByText("이 종류는 지금 발송되지 않습니다")).toBeInTheDocument();
  expect(screen.getByText("발송 불가")).toBeInTheDocument();
  expect(remoteEnabledCalls.every((value) => !value)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "승인 템플릿 조회" }));
  expect(await screen.findByText("공급자 승인 템플릿")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});
