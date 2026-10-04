import "@testing-library/jest-dom";

// rc-util의 테스트 고정 ID는 중첩 모달의 제목 연결과 Escape 스택을 충돌시킨다.
// 실제 React ID를 사용하되 명시한 ID와 나머지 모듈 API는 보존한다.
jest.mock("@rc-component/util/lib/hooks/useId", () => {
  const actual = jest.requireActual("@rc-component/util/lib/hooks/useId");
  const { useId } = jest.requireActual<typeof import("react")>("react");
  return {
    ...actual,
    __esModule: true,
    default: function useUniqueId(id?: string) {
      const generatedId = useId();
      return id || generatedId;
    },
  };
});
jest.mock("@rc-component/util/es/hooks/useId", () =>
  jest.requireMock("@rc-component/util/lib/hooks/useId"),
);

// Responsive antd controls need these browser APIs; retain each test's own overrides.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
    }),
  });
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
}

// jsdom에는 MessageChannel이 없다. antd v6 Select가 열림/닫힘 전환을 macro task로 미루면서
// 이 API를 쓰기 때문에, 폴리필이 없으면 Select를 여는 테스트가 ReferenceError로 실패한다.
// Node 구현(worker_threads)은 포트를 열어 둬 Jest 종료를 방해하므로 setTimeout 기반 최소 구현을 쓴다.
if (typeof globalThis.MessageChannel === "undefined") {
  class TestMessagePort {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    counterpart: TestMessagePort | null = null;

    postMessage(data: unknown) {
      setTimeout(() => this.counterpart?.onmessage?.({ data }), 0);
    }

    close() {}
  }

  class TestMessageChannel {
    port1 = new TestMessagePort();
    port2 = new TestMessagePort();

    constructor() {
      this.port1.counterpart = this.port2;
      this.port2.counterpart = this.port1;
    }
  }

  globalThis.MessageChannel = TestMessageChannel as unknown as typeof globalThis.MessageChannel;
}
