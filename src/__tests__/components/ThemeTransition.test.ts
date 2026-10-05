import "@/test-utils/antd";
import { cancelThemeTransition, transitionTheme } from "@/components/ThemeTransition";

const originalTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");
const originalMatchMedia = window.matchMedia.bind(window);
const reducedMotion = "(prefers-reduced-motion: reduce)";

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}
function pendingTransition() {
  const ready = deferred();
  const update = deferred();
  const finished = deferred();
  return {
    ready, update, finished,
    transition: {
      ready: ready.promise, updateCallbackDone: update.promise, finished: finished.promise,
      skipTransition: jest.fn(), types: new Set<string>(),
    } satisfies ViewTransition,
  };
}
function nativeTransition(value: typeof document.startViewTransition | undefined) {
  Object.defineProperty(document, "startViewTransition", { configurable: true, value });
}

beforeEach(() => {
  jest.useFakeTimers();
  nativeTransition(undefined);
});
afterEach(() => {
  cancelThemeTransition();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalTransition) Object.defineProperty(document, "startViewTransition", originalTransition);
  else delete (document as Partial<Document>).startViewTransition;
  document.documentElement.style.removeProperty("--admin-theme-transition-duration");
});

test("API 미지원 브라우저는 공통 색상 전환을 350ms 유지하고 정리한다", () => {
  const update = jest.fn(() => {
    expect(document.documentElement.dataset.adminThemeTransition).toBe("colors");
    expect(document.documentElement.style.getPropertyValue("--admin-theme-transition-duration")).toBe("350ms");
  });
  transitionTheme(update, true);
  expect(update).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(349);
  expect(document.documentElement.dataset.adminThemeTransition).toBe("colors");
  jest.advanceTimersByTime(1);
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});

test("빠른 재선택은 이전 update를 무효화하고 이전 finished가 새 전환을 정리하지 못한다", async () => {
  const first = pendingTransition(); const second = pendingTransition();
  const callbacks: (() => void)[] = [];
  nativeTransition(jest.fn((callback) => {
    if (typeof callback === "function") callbacks.push(callback);
    return callbacks.length === 1 ? first.transition : second.transition;
  }));
  const oldUpdate = jest.fn(); const latestUpdate = jest.fn();
  transitionTheme(oldUpdate, true);
  transitionTheme(latestUpdate, true);
  expect(first.transition.skipTransition).toHaveBeenCalledTimes(1);
  callbacks[0](); callbacks[1](); callbacks[1]();
  expect(oldUpdate).not.toHaveBeenCalled();
  expect(latestUpdate).toHaveBeenCalledTimes(1);
  first.ready.reject(new Error("skipped")); first.finished.resolve();
  await Promise.resolve();
  expect(document.documentElement.dataset.adminThemeTransition).toBe("snapshot");
  second.finished.resolve();
  await Promise.resolve();
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});

test("진행 중 테마와 같은 현재 팔레트로 돌아오면 즉시 적용하고 오래된 callback을 무효화한다", () => {
  const pending = pendingTransition(); let callback: (() => void) | undefined;
  nativeTransition(jest.fn((update) => { if (typeof update === "function") callback = update; return pending.transition; }));
  const dark = jest.fn(); const light = jest.fn();
  transitionTheme(dark, true);
  transitionTheme(light, false);
  callback?.();
  expect(pending.transition.skipTransition).toHaveBeenCalledTimes(1);
  expect(dark).not.toHaveBeenCalled(); expect(light).toHaveBeenCalledTimes(1);
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});

test("OS의 모션 감소 설정은 native 전환 없이 모든 색상을 즉시 바꾼다", () => {
  const start = jest.fn(); nativeTransition(start);
  jest.spyOn(window, "matchMedia").mockImplementation((query) => {
    const media = originalMatchMedia(query);
    if (query === reducedMotion) Object.defineProperty(media, "matches", { configurable: true, value: true });
    return media;
  });
  const update = jest.fn(() => expect(document.documentElement.dataset.adminThemeTransition).toBe("instant"));
  transitionTheme(update, true);
  expect(start).not.toHaveBeenCalled(); expect(update).toHaveBeenCalledTimes(1);
  jest.runOnlyPendingTimers();
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});

test("native snapshot 실패는 최신 팔레트를 적용하고 rejection과 전환 표식을 정리한다", async () => {
  const pending = pendingTransition();
  nativeTransition(jest.fn(() => pending.transition));
  const update = jest.fn(); transitionTheme(update, true);
  pending.ready.reject(new Error("capture unavailable"));
  await Promise.resolve();
  expect(update).toHaveBeenCalledTimes(1);
  pending.finished.reject(new Error("capture unavailable"));
  await Promise.resolve();
  expect(update).toHaveBeenCalledTimes(1);
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});

test("native API 호출이 실패해도 공통 색상 전환으로 안전하게 적용한다", () => {
  nativeTransition(jest.fn(() => { throw new Error("unsupported capture"); }));
  const update = jest.fn(); transitionTheme(update, true);
  expect(update).toHaveBeenCalledTimes(1);
  expect(document.documentElement.dataset.adminThemeTransition).toBe("colors");
});

test("마지막 provider가 사라지면 미완료 callback이 이후 페이지를 변경하지 못한다", () => {
  const pending = pendingTransition(); let callback: (() => void) | undefined;
  nativeTransition(jest.fn((update) => { if (typeof update === "function") callback = update; return pending.transition; }));
  const update = jest.fn(); transitionTheme(update, true);
  cancelThemeTransition(); callback?.();
  expect(pending.transition.skipTransition).toHaveBeenCalledTimes(1);
  expect(update).not.toHaveBeenCalled();
  expect(document.documentElement.dataset.adminThemeTransition).toBeUndefined();
});
