"use client";

import { useSyncExternalStore } from "react";

const KEY = "landy-admin-sidebar";
const listeners = new Set<() => void>();
let choice: boolean | undefined;
let initialized = false;
const parse = (value: string | null) => value === "collapsed" ? true : value === "expanded" ? false : undefined;
function snapshot() {
  if (!initialized) {
    initialized = true;
    try { choice = parse(localStorage.getItem(KEY)); } catch { /* Session preference remains usable. */ }
  }
  return choice;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) { choice = parse(event.newValue); listener(); }
  };
  window.addEventListener("storage", storage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", storage); };
}
export function useSidebarPreference() {
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => undefined);
  return [collapsed, (next: boolean) => {
    initialized = true; choice = next;
    try { localStorage.setItem(KEY, next ? "collapsed" : "expanded"); } catch { /* Keep the session choice. */ }
    listeners.forEach((listener) => listener());
  }] as const;
}
