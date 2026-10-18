import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { AlimtalkTestSendModal } from "@/features/alimtalk/components/AlimtalkTestSendModal";
import { approvedAlimtalkTemplate } from "@/test-utils/alimtalk";
import type { AlimtalkTemplate } from "@/features/alimtalk/types";

const DUE_TEMPLATE: AlimtalkTemplate = {
  ...approvedAlimtalkTemplate,
  type: "DUE",
  templateId: "KA01TP_DUE",
  status: "APPROVED",
  content: "#{세대정보} 임대료 #{납부액}원의 납부일입니다.",
  variableNames: ["#{세대정보}", "#{납부액}"],
};

const OVERDUE_TEMPLATE: AlimtalkTemplate = {
  ...DUE_TEMPLATE,
  type: "OVERDUE",
  templateId: "KA01TP_OVERDUE",
  content: "#{세대정보} 임대료 #{납부액}원이 미납입니다. (#{경과일}일 경과)",
  variableNames: ["#{세대정보}", "#{납부액}", "#{경과일}"],
};

let mockTemplates: AlimtalkTemplate[] = [];
const mockRefetch = jest.fn();
let mockError: Error | null = null;
const mockSendTest = jest.fn();

jest.mock("@/features/alimtalk/hooks", () => ({
  useAlimtalkTemplates: () => ({
    data: { templates: mockTemplates }, isFetching: false, error: mockError, refetch: mockRefetch,
  }),
  useSendTestAlimtalk: () => ({ mutate: mockSendTest, isPending: false }),
}));

beforeEach(() => {
  mockTemplates = [DUE_TEMPLATE, OVERDUE_TEMPLATE];
  mockError = null;
  mockRefetch.mockReset();
  mockSendTest.mockReset();
});

function renderSendModal() {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App>
    <AlimtalkTestSendModal open onClose={jest.fn()} />
  </App></ConfigProvider>);
}

test("입력한 번호와 변수값을 그대로 발송 요청에 담는다", async () => {
  renderSendModal();
  expect(screen.queryByLabelText("#{경과일}")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("수신 번호"), { target: { value: "010-1234-5678" } });
  fireEvent.change(screen.getByLabelText("#{세대정보}"), { target: { value: "101호 홍길동님" } });
  fireEvent.change(screen.getByLabelText("#{납부액}"), { target: { value: "500,000" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));

  await waitFor(() => {
    expect(mockSendTest).toHaveBeenCalledWith(
      {
        type: "DUE",
        phone: "010-1234-5678",
        variables: { "#{세대정보}": "101호 홍길동님", "#{납부액}": "500,000" },
      },
      expect.any(Object),
    );
  });
});

test("010이 아닌 번호는 발송 요청을 만들지 않는다", async () => {
  renderSendModal();

  fireEvent.change(screen.getByLabelText("수신 번호"), { target: { value: "02-123-4567" } });
  fireEvent.change(screen.getByLabelText("#{세대정보}"), { target: { value: "101호 홍길동님" } });
  fireEvent.change(screen.getByLabelText("#{납부액}"), { target: { value: "500,000" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));

  await screen.findByText("010으로 시작하는 휴대폰 번호를 입력하세요.");
  expect(mockSendTest).not.toHaveBeenCalled();
});

test("종류를 바꾸면 그 종류의 승인 템플릿으로 변수칸을 다시 만든다", async () => {
  renderSendModal();

  fireEvent.change(screen.getByLabelText("#{세대정보}"), { target: { value: "남는 값" } });
  fireEvent.click(screen.getByText("미납 안내"));

  await screen.findByLabelText("#{경과일}");
  expect(screen.getByLabelText("#{경과일}")).toBeInTheDocument();
  // 종류마다 변수가 다르므로 이전 종류의 입력값이 새 칸에 남으면 안 된다.
  expect(screen.getByLabelText("#{세대정보}")).toHaveValue("");
});

test.each([
  ["missing", []],
  ["mismatch", [{ ...DUE_TEMPLATE, syncRequired: true }]],
  ["unapproved", [{ ...DUE_TEMPLATE, status: "INSPECTING" }]],
  ["unsupported", [{ ...DUE_TEMPLATE, form: null }]],
] as const)("%s 승인 정보로는 과금 발송하지 않고 갱신을 안내한다", (_case, templates) => {
  mockTemplates = [...templates];
  renderSendModal();
  expect(screen.getByRole("button", { name: "발송" })).toBeDisabled();
  expect(screen.getByText("저장된 승인 정보가 필요합니다")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "발송" }));
  expect(mockSendTest).not.toHaveBeenCalled();
});

test("테스트 변수와 제목·부제목·동작은 저장된 동일 승인 정보에서 표시한다", () => {
  const snapshot = { ...DUE_TEMPLATE, title: "제목 #{제목}", subtitle: "부제목", extra: "추가 #{추가}",
    variableNames: ["#{제목}", "#{추가}", "#{버튼}"], buttons: [{ buttonName: "확인 #{버튼}", buttonType: "WL", linkMo: "https://example.com" }],
  };
  mockTemplates = [snapshot];
  renderSendModal();
  expect(screen.getByText("제목 #{제목}")).toBeInTheDocument();
  expect(screen.getByText("부제목")).toBeInTheDocument();
  expect(screen.getByText(/확인 #\{버튼\}/)).toBeInTheDocument();
  expect(screen.getByLabelText("#{버튼}")).toBeInTheDocument();
  expect(screen.queryByLabelText("#{세대정보}")).not.toBeInTheDocument();
});

test("저장 승인 정보 조회 실패는 표시하고 재조회할 수 있다", () => {
  mockError = new Error("network");
  renderSendModal();
  expect(screen.getByRole("button", { name: "발송" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

test("같은 클릭 구간의 중복 제출은 유료 요청 하나만 만든다", async () => {
  renderSendModal();
  fireEvent.change(screen.getByLabelText("수신 번호"), { target: { value: "010-1234-5678" } });
  fireEvent.change(screen.getByLabelText("#{세대정보}"), { target: { value: "101호" } });
  fireEvent.change(screen.getByLabelText("#{납부액}"), { target: { value: "500,000" } });
  const send = screen.getByRole("button", { name: "발송" });
  fireEvent.click(send);
  fireEvent.click(send);
  await waitFor(() => expect(mockSendTest).toHaveBeenCalledTimes(1));
  expect(send).toBeDisabled();
});
