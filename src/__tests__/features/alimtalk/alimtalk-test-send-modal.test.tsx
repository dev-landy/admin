import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { AlimtalkTestSendModal } from "@/features/alimtalk/components/AlimtalkTestSendModal";
import type { AlimtalkType, RemoteAlimtalkTemplate } from "@/features/alimtalk/types";

const DUE_TEMPLATE: RemoteAlimtalkTemplate = {
  type: "DUE",
  templateId: "KA01TP_DUE",
  name: "납부일 안내",
  status: "APPROVED",
  content: "#{세대정보} 임대료 #{납부액}원의 납부일입니다.",
  variableNames: ["#{세대정보}", "#{납부액}"],
  storedBodyMatches: true,
};

const OVERDUE_TEMPLATE: RemoteAlimtalkTemplate = {
  ...DUE_TEMPLATE,
  type: "OVERDUE",
  templateId: "KA01TP_OVERDUE",
  name: "미납 안내",
  content: "#{세대정보} 임대료 #{납부액}원이 미납입니다. (#{경과일}일 경과)",
  variableNames: ["#{세대정보}", "#{납부액}", "#{경과일}"],
};

const remoteCalls: AlimtalkType[] = [];
const mockSendTest = jest.fn();

jest.mock("@/features/alimtalk/hooks", () => ({
  useRemoteAlimtalkTemplate: (type: AlimtalkType) => {
    remoteCalls.push(type);
    return {
      data: type === "DUE" ? DUE_TEMPLATE : OVERDUE_TEMPLATE,
      isFetching: false,
      error: null,
    };
  },
  useSendTestAlimtalk: () => ({ mutate: mockSendTest, isPending: false }),
}));

beforeEach(() => {
  remoteCalls.length = 0;
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

  await waitFor(() => expect(remoteCalls).toContain("OVERDUE"));
  expect(screen.getByLabelText("#{경과일}")).toBeInTheDocument();
  // 종류마다 변수가 다르므로 이전 종류의 입력값이 새 칸에 남으면 안 된다.
  expect(screen.getByLabelText("#{세대정보}")).toHaveValue("");
});
