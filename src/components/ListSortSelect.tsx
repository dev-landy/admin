"use client";

import { NativeSelect } from "./NativeSelect";

export type SortDirection = "asc" | "desc";
export type ListSortField = { value: string; label: string };
export type ListSortControl = {
  fields: readonly ListSortField[];
  field: string;
  direction: SortDirection;
  onChange: (field: string, direction: SortDirection) => void;
};

export function ListSortSelect({ fields, field, direction, onChange, label }: ListSortControl & { label: string }) {
  return <div className="admin-list-sort" role="group" aria-label={`${label} 정렬`}>
    <NativeSelect aria-label={`${label} 정렬 기준`} value={field} onChange={(event) => onChange(event.target.value, direction)}>
      {fields.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </NativeSelect>
    <NativeSelect aria-label={`${label} 정렬 순서`} value={direction} onChange={(event) => onChange(field, event.target.value as SortDirection)}>
      <option value="desc">내림차순</option>
      <option value="asc">오름차순</option>
    </NativeSelect>
  </div>;
}
