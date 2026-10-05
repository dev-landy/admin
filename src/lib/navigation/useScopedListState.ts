"use client";

import { useCallback, useMemo, useState } from "react";
import { positiveInteger } from "./listParams";

export type ListNavigation = {
  query: string;
  returnPath: string;
  update: (changes: Record<string, string | undefined>, replace?: boolean) => void;
};

/** Keep each embedded list's filters and page independent in its parent's URL. */
export function useScopedListState(navigation: ListNavigation | undefined, prefix: string) {
  const [local, setLocal] = useState<Record<string, string>>({});
  const query = navigation?.query;
  const params = useMemo(() => {
    if (query === undefined) return new URLSearchParams(local);
    const scoped = new URLSearchParams();
    for (const [key, value] of new URLSearchParams(query)) {
      if (!key.startsWith(prefix) || key.length === prefix.length) continue;
      const name = key.slice(prefix.length); scoped.set(name[0].toLowerCase() + name.slice(1), value);
    }
    return scoped;
  }, [query, local, prefix]);
  const update = useCallback((changes: Record<string, string | undefined>, replace = false) => {
    if (navigation) {
      navigation.update(Object.fromEntries(Object.entries(changes).map(([key, value]) => [`${prefix}${key[0].toUpperCase()}${key.slice(1)}`, value])), replace);
    } else {
      setLocal((previous) => {
        const next = { ...previous };
        for (const [key, value] of Object.entries(changes)) { if (value === undefined) delete next[key]; else next[key] = value; }
        return next;
      });
    }
  }, [navigation, prefix]);
  return { params, page: positiveInteger(params.get("page"), 1), size: positiveInteger(params.get("size"), 20, 100), update };
}
