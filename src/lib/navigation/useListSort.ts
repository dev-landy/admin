"use client";

import { useState } from "react";
import type { ListSortControl, ListSortField, SortDirection } from "@/components/ListSortSelect";
import type { ListNavigation } from "./useScopedListState";

export type { ListSortControl, ListSortField, SortDirection } from "@/components/ListSortSelect";

type Options = {
  fields: readonly ListSortField[];
  defaultField: string;
  defaultDirection?: SortDirection;
  sortKey?: string;
  pageKey?: string;
  navigation?: { query: string; update: ListNavigation["update"]; returnPath?: string };
};

/** 정렬은 페이지와 함께 저장하며 기존 검색·다른 하위 목록 조건을 유지한다. */
export function useListSort({ fields, defaultField, defaultDirection = "desc", sortKey = "sort", pageKey = "page", navigation }: Options) {
  const [local, setLocal] = useState<string>();
  const raw = navigation ? new URLSearchParams(navigation.query).get(sortKey) : local;
  const parts = raw?.split(",");
  const valid = parts?.length === 2 && fields.some((option) => option.value === parts[0]) && (parts[1] === "asc" || parts[1] === "desc");
  const field = valid ? parts[0] : defaultField;
  const direction: SortDirection = valid ? parts[1] as SortDirection : defaultDirection;
  const requestParams: { sort?: string } = valid ? { sort: `${field},${direction}` } : {};
  const control: ListSortControl = {
    fields, field, direction,
    onChange(nextField, nextDirection) {
      if (!fields.some((option) => option.value === nextField)) return;
      const next = `${nextField},${nextDirection}`;
      if (navigation) navigation.update({ [sortKey]: next, [pageKey]: "1" });
      else setLocal(next);
    },
  };
  return { control, requestParams, field, direction };
}
