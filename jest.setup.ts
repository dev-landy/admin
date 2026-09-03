import "@testing-library/jest-dom";

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
