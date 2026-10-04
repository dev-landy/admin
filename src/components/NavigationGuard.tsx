"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef } from "react";

const LEAVE_MESSAGE = "작성 중인 내용이 저장되지 않았습니다. 이동하면 변경 내용이 사라집니다. 이동할까요?";
const HISTORY_INDEX = "__landyNavigationIndex";
type DirtyCheck = () => boolean;
type NavigationGuard = {
  register: (id: string, check: DirtyCheck) => () => void;
  clear: (id: string) => void;
  requestNavigation: (navigate: () => void) => boolean;
};
const NavigationGuardContext = createContext<NavigationGuard | null>(null);

function historyIndex(state: unknown): number | undefined {
  if (!state || typeof state !== "object") return undefined;
  const index = (state as Record<string, unknown>)[HISTORY_INDEX];
  return typeof index === "number" && Number.isSafeInteger(index) ? index : undefined;
}
function withIndex(state: unknown, index: number) {
  // Next owns the rest of the state (including its router tree). Never replace that payload.
  return { ...(state && typeof state === "object" ? state : {}), [HISTORY_INDEX]: index };
}

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const checks = useRef(new Map<string, DirtyCheck>());
  const isDirty = useCallback(() => [...checks.current.values()].some((check) => check()), []);
  const confirmLeave = useCallback(() => !isDirty() || window.confirm(LEAVE_MESSAGE), [isDirty]);
  const guard = useMemo<NavigationGuard>(() => ({
    register(id, check) {
      checks.current.set(id, check);
      return () => { if (checks.current.get(id) === check) checks.current.delete(id); };
    },
    clear(id) { checks.current.delete(id); },
    requestNavigation(navigate) {
      if (!confirmLeave()) return false;
      navigate();
      return true;
    },
  }), [confirmLeave]);

  useEffect(() => {
    const history = window.history;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    let currentIndex = historyIndex(history.state) ?? 0;
    let restoring = false;
    let active = true;
    originalReplace.call(history, withIndex(history.state, currentIndex), "");
    const push: History["pushState"] = function (state, unused, url) {
      if (!active) return originalPush.call(history, state, unused, url);
      const nextIndex = currentIndex + 1;
      originalPush.call(history, withIndex(state, nextIndex), unused, url);
      currentIndex = nextIndex;
    };
    const replace: History["replaceState"] = function (state, unused, url) {
      return originalReplace.call(history, active ? withIndex(state, currentIndex) : state, unused, url);
    };
    history.pushState = push;
    history.replaceState = replace;

    function onPopState(event: PopStateEvent) {
      const targetIndex = historyIndex(event.state);
      if (restoring) {
        event.stopImmediatePropagation();
        if (targetIndex === currentIndex) restoring = false;
        else history.go(targetIndex === undefined ? 1 : currentIndex - targetIndex);
        return;
      }
      if (targetIndex === currentIndex) return;
      if (!confirmLeave()) {
        // popstate cannot be cancelled. Restore the entry before Next processes the event,
        // so cancelling Back keeps the mounted editor, its values, and Next's route state.
        event.stopImmediatePropagation();
        restoring = true;
        history.go(targetIndex === undefined ? 1 : currentIndex - targetIndex);
        return;
      }
      currentIndex = targetIndex ?? currentIndex - 1;
      if (targetIndex === undefined) originalReplace.call(history, withIndex(event.state, currentIndex), "");
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function onLinkClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener("popstate", onPopState, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      active = false;
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
      window.removeEventListener("popstate", onPopState, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [confirmLeave, isDirty]);

  return <NavigationGuardContext.Provider value={guard}>{children}</NavigationGuardContext.Provider>;
}

export function useNavigationGuard() {
  const guard = useContext(NavigationGuardContext);
  return { requestNavigation: guard?.requestNavigation ?? ((navigate: () => void) => { navigate(); return true; }) };
}

export function useUnsavedChanges(dirty: boolean, hasUncommittedChanges?: DirtyCheck) {
  const guard = useContext(NavigationGuardContext);
  const id = useId();
  useEffect(() => guard?.register(id, () => dirty || !!hasUncommittedChanges?.()), [guard, id, dirty, hasUncommittedChanges]);
  return useCallback(() => guard?.clear(id), [guard, id]);
}
