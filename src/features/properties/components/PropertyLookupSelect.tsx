"use client";

import { forwardRef, useEffect, useState } from "react";
import { Button, Select, Spin, type GetRef, type SelectProps } from "antd";
import { optionalPositiveInteger } from "@/lib/navigation/listParams";
import { useProperties } from "../hooks";

type Props = Omit<SelectProps<number>, "value" | "options" | "showSearch" | "onChange"> & { value?: number; onChange?: (value: number | undefined) => void; userId?: number };

export const PropertyLookupSelect = forwardRef<GetRef<typeof Select>, Props>(function PropertyLookupSelect({ value, onChange, userId, onOpenChange, placeholder = "건물명·주소 또는 ID 검색", ...props }, ref) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => { const timer = setTimeout(() => setKeyword(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const id = optionalPositiveInteger(keyword);
  const results = useProperties({ page: 1, size: 20, userId, keyword: keyword || undefined }, open);
  const exact = useProperties({ page: 1, size: 1, userId, propertyId: id }, open && id !== undefined);
  const selected = useProperties({ page: 1, size: 1, userId, propertyId: value }, value !== undefined);
  const properties = [...(id !== undefined ? exact.data?.properties ?? [] : []), ...(!search.trim() && value ? selected.data?.properties ?? [] : []), ...(results.data?.properties ?? [])];
  const options = [...new Map(properties.map((property) => [property.propertyId, { value: property.propertyId, label: `#${property.propertyId} · ${property.name}${property.address ? ` · ${property.address}` : ""}` }])).values()];
  if (!search.trim() && value && !options.some((option) => option.value === value)) options.unshift({ value, label: `건물 #${value}` });
  const searching = search.trim() !== keyword;
  const exactError = id !== undefined && exact.error;
  const retry = () => { void results.refetch(); if (id !== undefined) void exact.refetch(); };
  return <Select<number> {...props} className={`admin-entity-lookup ${props.className ?? ""}`} ref={ref} value={value} onChange={(next) => { setSearch(""); onChange?.(next); }} allowClear placeholder={placeholder}
    virtual={props.virtual ?? false}
    showSearch={{ filterOption: false, searchValue: search, onSearch: setSearch }} onOpenChange={(next) => { setOpen(next); onOpenChange?.(next); if (!next) setSearch(""); }} options={searching ? [] : options}
    labelRender={props.labelRender ?? ((item) => selected.data?.properties[0] && item.value === value ? `#${value} · ${selected.data.properties[0].name}` : item.label ?? `건물 #${item.value}`)}
    loading={searching || results.isFetching || (id !== undefined && exact.isFetching) || (value !== undefined && selected.isFetching)}
    popupRender={(menu) => <div className="admin-lookup-options">{options.length > 0 && (results.error || exactError) && <div role="alert"><Button size="small" onClick={retry}>일부 검색 실패 · 다시 조회</Button></div>}{props.popupRender ? props.popupRender(menu) : menu}</div>}
    notFoundContent={searching || results.isFetching || (id !== undefined && exact.isFetching) ? <Spin size="small" aria-label="건물 검색 중" /> : results.error || exactError ? <Button size="small" onClick={retry}>검색 실패 · 다시 조회</Button> : "일치하는 건물이 없습니다."} style={{ width: "100%", ...props.style }} />;
});
