"use client";

import { createContext, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { parseThemeMode, resolveTheme, SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, type ResolvedTheme, type ThemeMode } from "@/config/theme";
import { cancelThemeTransition, transitionTheme } from "@/components/ThemeTransition";

type ThemeState = { mode: ThemeMode; resolved: ResolvedTheme };
const serverSnapshot: ThemeState = { mode: "system", resolved: "light" };
let snapshot = serverSnapshot;
let requestedState = serverSnapshot;
let query: MediaQueryList | null = null;
let sessionMode: ThemeMode | null = null;
let stopListening: (() => void) | null = null;
const listeners = new Set<() => void>();
const ThemeContext = createContext<ThemeState & { setMode: (mode: ThemeMode) => void }>({ ...serverSnapshot, setMode: () => undefined });
const getServerSnapshot = () => serverSnapshot;

function readStoredMode(): ThemeMode {
  try { return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY)); } catch { return "system"; }
}
function remember(mode: ThemeMode, systemDark: boolean) {
  const resolved = resolveTheme(mode, systemDark);
  if (snapshot.mode !== mode || snapshot.resolved !== resolved) snapshot = { mode, resolved };
  requestedState = snapshot;
  return snapshot;
}
function applyDocumentTheme(state: ThemeState) {
  document.documentElement.dataset.theme = state.resolved;
  document.documentElement.dataset.themeMode = state.mode;
  document.documentElement.style.colorScheme = state.resolved;
}
function getSnapshot() {
  if (typeof window === "undefined") return serverSnapshot;
  if (!stopListening) return remember(sessionMode ?? readStoredMode(), window.matchMedia(SYSTEM_THEME_QUERY).matches);
  return snapshot;
}
function emit(mode: ThemeMode, systemDark: boolean) {
  const next = { mode, resolved: resolveTheme(mode, systemDark) };
  if (requestedState.mode === next.mode && requestedState.resolved === next.resolved) return;
  requestedState = next;
  transitionTheme(() => {
    // The document variables and Ant Design tokens must enter the new snapshot
    // in the same commit. This boundary only runs for browser/user events.
    flushSync(() => {
      snapshot = next;
      applyDocumentTheme(snapshot);
      for (const listener of listeners) listener();
    });
  }, snapshot.resolved !== next.resolved);
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!stopListening) {
    query = window.matchMedia(SYSTEM_THEME_QUERY);
    remember(sessionMode ?? readStoredMode(), query.matches);
    const media = query;
    const systemChanged = (event: MediaQueryListEvent) => { if (requestedState.mode === "system") emit("system", event.matches); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        sessionMode = null;
        emit(parseThemeMode(event.newValue), media.matches);
      }
    };
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", storageChanged);
    stopListening = () => {
      media.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", storageChanged);
    };
    applyDocumentTheme(snapshot);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListening?.(); stopListening = null; query = null; sessionMode = null;
      cancelThemeTransition();
    }
  };
}
function setMode(mode: ThemeMode) {
  sessionMode = mode;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* A blocked store still permits a session choice. */ }
  emit(mode, query?.matches ?? window.matchMedia(SYSTEM_THEME_QUERY).matches);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // A stable server snapshot keeps hydration identical. Browser preferences are
  // external state; subscriptions update consumers without resetting their forms.
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useLayoutEffect(() => { applyDocumentTheme(getSnapshot()); }, [state]);
  return <ThemeContext.Provider value={{ ...state, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
