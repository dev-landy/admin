"use client";

import { useSyncExternalStore } from "react";

export type AdminViewport = "mobile" | "compact" | "wide";
function snapshot(): AdminViewport {
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  return window.matchMedia("(min-width: 1600px)").matches ? "wide" : "compact";
}
function subscribe(callback: () => void) {
  const queries = [window.matchMedia("(max-width: 767px)"), window.matchMedia("(min-width: 1600px)")];
  queries.forEach((query) => query.addEventListener("change", callback));
  return () => queries.forEach((query) => query.removeEventListener("change", callback));
}
const serverSnapshot = (): AdminViewport => "wide";

/** Shared breakpoints keep navigation, records and pagination in the same mode. */
export function useAdminViewport(): AdminViewport {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
