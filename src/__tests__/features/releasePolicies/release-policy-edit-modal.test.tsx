import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { ReleasePolicyEditModal } from "@/features/releasePolicies/components/ReleasePolicyEditModal";
import type {
  ReleasePolicy,
  UpdateReleasePolicyRequest,
} from "@/features/releasePolicies/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element): CSSStyleDeclaration => getComputedStyle(element);

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

// antd v6 Modal 내부 폼 렌더링이 MessageChannel을 사용한다. jsdom에는 없어 최소 구현을 넣는다.
class MockMessageChannel {
  port1 = { onmessage: null as ((event: MessageEvent) => void) | null };
  port2 = {
    postMessage: () => {
      setTimeout(() => this.port1.onmessage?.({} as MessageEvent), 0);
    },
  };
}

Object.defineProperty(global, "MessageChannel", { writable: true, value: MockMessageChannel });

type UpdateVariables = { appReleasePolicyId: number; body: UpdateReleasePolicyRequest };
type UpdateOptions = { onSuccess: () => void; onError: (error: unknown) => void };

const mockUpdate = jest.fn();
const onClose = jest.fn();

jest.mock("@/features/releasePolicies/hooks", () => ({
  useUpdateReleasePolicy: () => ({ mutate: mockUpdate, isPending: false }),
}));

const policy: ReleasePolicy = {
  appReleasePolicyId: 3,
  platform: "IOS",
  channel: "PRODUCTION",
  latestBuildNumber: 42,
  latestVersion: "1.4.2",
  minSupportedBuildNumber: 30,
  storeUrl: "https://apps.apple.com/app/id123456789",
  forceUpdateTitle: "업데이트가 필요합니다",
  forceUpdateMessage: "계속 사용하려면 최신 버전으로 업데이트하세요.",
  softUpdateTitle: "새 버전이 있습니다",
  softUpdateMessage: "지금 업데이트하면 더 편하게 쓸 수 있습니다.",
  createdAt: "2026-08-01T09:00:00",
  updatedAt: "2026-09-01T12:00:00",
};

const LATEST_BUILD_LABEL = "최신 빌드 번호 (1 이상)";
const MIN_BUILD_LABEL = "최소 지원 빌드 번호 (1 이상, 최신 빌드 번호 이하)";

function badRequest(): AxiosError {
  return new AxiosError("unprocessable", undefined, undefined, undefined, {
    data: {
      type: "https://landy.app/problems/release-policy-invalid",
      title: "릴리즈 정책을 변경할 수 없습니다",
      status: 422,
      detail: "최소 지원 빌드 번호가 최신 빌드 번호보다 큽니다.",
    },
    status: 422,
    statusText: "Unprocessable Content",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
}

async function openModal(target: ReleasePolicy = policy): Promise<HTMLElement> {
  render(
    <App>
      <ReleasePolicyEditModal policy={target} onClose={onClose} />
    </App>,
  );
  return screen.findByRole("dialog");
}

beforeEach(() => {
  mockUpdate.mockReset();
  onClose.mockReset();
});

test("수정 모달은 현재 정책 값으로 채워지고 플랫폼·채널은 읽기 전용으로 보여준다", async () => {
  const dialog = await openModal();

  expect(within(dialog).getByText("IOS")).toBeInTheDocument();
  expect(within(dialog).getByText("PRODUCTION")).toBeInTheDocument();
  // 플랫폼·채널은 식별자라 입력 항목으로 열리지 않는다.
  expect(within(dialog).queryByLabelText("플랫폼")).not.toBeInTheDocument();
  expect(within(dialog).queryByLabelText("채널")).not.toBeInTheDocument();

  expect(within(dialog).getByLabelText("최신 버전")).toHaveValue("1.4.2");
  expect(within(dialog).getByLabelText(LATEST_BUILD_LABEL)).toHaveValue("42");
  expect(within(dialog).getByLabelText(MIN_BUILD_LABEL)).toHaveValue("30");
  expect(within(dialog).getByLabelText("스토어 URL")).toHaveValue(
    "https://apps.apple.com/app/id123456789",
  );
  expect(within(dialog).getByLabelText("강제 업데이트 제목")).toHaveValue("업데이트가 필요합니다");
  expect(within(dialog).getByLabelText("강제 업데이트 메시지")).toHaveValue(
    "계속 사용하려면 최신 버전으로 업데이트하세요.",
  );
  expect(within(dialog).getByLabelText("소프트 업데이트 제목")).toHaveValue("새 버전이 있습니다");
  expect(within(dialog).getByLabelText("소프트 업데이트 메시지")).toHaveValue(
    "지금 업데이트하면 더 편하게 쓸 수 있습니다.",
  );
});

test("수정한 값 전체를 정책 ID와 함께 보낸다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText("최신 버전"), { target: { value: "1.5.0" } });
  fireEvent.change(within(dialog).getByLabelText(LATEST_BUILD_LABEL), { target: { value: "43" } });
  fireEvent.change(within(dialog).getByLabelText(MIN_BUILD_LABEL), { target: { value: "40" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      {
        appReleasePolicyId: 3,
        body: {
          latestBuildNumber: 43,
          latestVersion: "1.5.0",
          minSupportedBuildNumber: 40,
          storeUrl: "https://apps.apple.com/app/id123456789",
          forceUpdateTitle: "업데이트가 필요합니다",
          forceUpdateMessage: "계속 사용하려면 최신 버전으로 업데이트하세요.",
          softUpdateTitle: "새 버전이 있습니다",
          softUpdateMessage: "지금 업데이트하면 더 편하게 쓸 수 있습니다.",
        },
      },
      expect.any(Object),
    );
  });
});

test("최소 지원 빌드 번호가 최신 빌드 번호보다 크면 저장하지 않고 이유를 알린다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText(MIN_BUILD_LABEL), { target: { value: "99" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(
    await within(dialog).findByText("최소 지원 빌드 번호는 최신 빌드 번호보다 클 수 없습니다."),
  ).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("최신 빌드 번호를 낮추면 최소 지원 빌드 번호 규칙을 다시 확인한다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText(LATEST_BUILD_LABEL), { target: { value: "10" } });

  expect(
    await within(dialog).findByText("최소 지원 빌드 번호는 최신 빌드 번호보다 클 수 없습니다."),
  ).toBeInTheDocument();
});

test("빌드 번호가 정수가 아니거나 비어 있으면 저장하지 않는다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText(LATEST_BUILD_LABEL), { target: { value: "1.5" } });
  fireEvent.change(within(dialog).getByLabelText(MIN_BUILD_LABEL), { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(await within(dialog).findByText("1 이상의 정수를 입력하세요.")).toBeInTheDocument();
  expect(within(dialog).getByText("최소 지원 빌드 번호를 입력하세요.")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("스토어 URL이 http/https 주소가 아니면 저장하지 않고 안내를 한 번만 보여준다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText("스토어 URL"), { target: { value: "스토어" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(
    await within(dialog).findByText("http 또는 https로 시작하는 URL을 입력하세요."),
  ).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("문구를 비우면 저장하지 않는다", async () => {
  const dialog = await openModal();

  fireEvent.change(within(dialog).getByLabelText("강제 업데이트 메시지"), {
    target: { value: "   " },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(
    await within(dialog).findByText("강제 업데이트 메시지를 입력하세요."),
  ).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("수정에 성공하면 어떤 정책을 바꿨는지 알리고 모달을 닫는다", async () => {
  mockUpdate.mockImplementation((_variables: UpdateVariables, options: UpdateOptions) => {
    options.onSuccess();
  });
  const dialog = await openModal();

  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(
    await screen.findByText("IOS PRODUCTION 릴리즈 정책이 수정되었습니다."),
  ).toBeInTheDocument();
  expect(onClose).toHaveBeenCalled();
});

test("수정에 실패하면 서버가 알려준 이유를 그대로 보여준다", async () => {
  mockUpdate.mockImplementation((_variables: UpdateVariables, options: UpdateOptions) => {
    options.onError(badRequest());
  });
  const dialog = await openModal();

  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(await screen.findByText("릴리즈 정책을 변경할 수 없습니다")).toBeInTheDocument();
  expect(
    screen.getByText("최소 지원 빌드 번호가 최신 빌드 번호보다 큽니다."),
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});
