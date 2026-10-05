type ListPath = "/users" | "/tenants";
type RelatedListPath = ListPath | "/properties" | "/payments" | "/payments/duplicates" | "/notifications" | "/notifications/outbox" | "/alimtalk";

/** Only return to the matching internal list, keeping its filters and pagination. */
export function listReturnPath(value: string | null | undefined, fallback: ListPath): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "https://landy.internal");
    if (url.origin !== "https://landy.internal" || url.pathname !== fallback || url.hash) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

/** Relationship links may return to a known admin list or user/tenant detail, never an arbitrary URL. */
export function detailReturnPath(value: string | null | undefined, fallback: ListPath): string {
  if (!value || value.length > 4096 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "https://landy.internal");
    const lists = ["/users", "/properties", "/tenants", "/payments", "/payments/duplicates", "/notifications", "/notifications/outbox", "/alimtalk", "/fcm", "/contract-documents", "/batch", "/batch/schedules"];
    const detailId = /^\/(?:users|tenants)\/([1-9]\d*)$/.exec(url.pathname)?.[1];
    const isDetail = detailId !== undefined && Number.isSafeInteger(Number(detailId));
    if (url.origin !== "https://landy.internal" || url.hash || (!lists.includes(url.pathname) && !isDetail)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function listDetailPath(path: ListPath, id: number, returnPath: string): string {
  const query = new URLSearchParams({ returnTo: detailReturnPath(returnPath, path) });
  return `${path}/${id}?${query.toString()}`;
}

export function relatedListPath(path: RelatedListPath, filters: Record<string, number | string | boolean | undefined>, returnPath?: string): string {
  const query = new URLSearchParams();
  if (path === "/alimtalk") query.set("tab", "history");
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
  if (returnPath) query.set("returnTo", detailReturnPath(returnPath, "/users"));
  return `${path}${query.size ? `?${query}` : ""}`;
}
