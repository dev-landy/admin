type ListPath = "/users" | "/tenants";

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

export function listDetailPath(path: ListPath, id: number, returnPath: string): string {
  const query = new URLSearchParams({ returnTo: listReturnPath(returnPath, path) });
  return `${path}/${id}?${query.toString()}`;
}
