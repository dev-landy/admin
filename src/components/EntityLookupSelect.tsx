"use client";

import { forwardRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Select, Spin, type GetRef, type SelectProps } from "antd";

import { fetchUsers } from "@/features/users/api";
import { userKeys } from "@/features/users/hooks";
import { fetchTenant, fetchTenants } from "@/features/tenants/api";
import { tenantKeys } from "@/features/tenants/hooks";
import { optionalPositiveInteger } from "@/lib/navigation/listParams";

type LookupProps = Omit<SelectProps<number>, "options" | "showSearch" | "onChange"> & {
  onChange?: (value: number | undefined) => void;
};

function useSearchTerm() {
  const [text, setText] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  return { text, keyword, setText };
}

/** 현재 페이지에 한정하지 않고 서버 전체 목록에서 연락처와 ID로 대상을 찾는다. */
export const UserLookupSelect = forwardRef<GetRef<typeof Select>, LookupProps>(function UserLookupSelect(
  { value, onChange, onOpenChange, placeholder = "이메일·전화번호·유저 ID 검색", ...props }, ref,
) {
  const [open, setOpen] = useState(false);
  const { text, keyword, setText } = useSearchTerm();
  const params = { page: 1, size: 20, keyword: keyword || undefined };
  const list = useQuery({ queryKey: userKeys.list(params), queryFn: () => fetchUsers(params), enabled: open });
  const keywordId = /^[1-9]\d*$/.test(keyword) ? optionalPositiveInteger(keyword) : undefined;
  const exactParams = { page: 1, size: 1, userId: keywordId };
  const exact = useQuery({ queryKey: userKeys.list(exactParams), queryFn: () => fetchUsers(exactParams), enabled: open && keywordId !== undefined });
  const selectedParams = { page: 1, size: 1, userId: typeof value === "number" ? value : undefined, accountState: "ACTIVE" as const };
  const selected = useQuery({
    queryKey: userKeys.list(selectedParams), queryFn: () => fetchUsers(selectedParams), enabled: typeof value === "number", refetchOnMount: "always",
  });
  const selectedUser = selected.data?.users.find((user) => user.userId === value && user.deletedAt == null);
  useEffect(() => {
    if (typeof value === "number" && selected.data && !selected.isFetching && !selected.error && !selectedUser) onChange?.(undefined);
  }, [value, selected.data, selected.isFetching, selected.error, selectedUser, onChange]);
  // 숫자와 같은 연락처가 많아도 정확한 ID가 검색 후보 첫 페이지 밖으로 밀리지 않는다.
  const users = [...new Map([...(exact.data?.users ?? []), ...(list.data?.users ?? [])].filter((user) => user.deletedAt == null).map((user) => [user.userId, user])).values()];
  const options = users.map((user) => ({
    value: user.userId, label: `${user.email || "이메일 없음"} · ${user.phone || "전화번호 없음"} · #${user.userId}`, disabled: false,
  }));
  if (!text.trim() && typeof value === "number" && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: selectedUser ? `${selectedUser.email || "이메일 없음"} · #${value}` : `유저 #${value}`, disabled: !selectedUser });
  }
  const exactError = keywordId !== undefined && exact.error;
  const searching = list.isFetching || (keywordId !== undefined && exact.isFetching) || text.trim() !== keyword;
  const retry = () => { void list.refetch(); if (keywordId !== undefined) void exact.refetch(); };
  return <Select<number>
    {...props} className={`admin-entity-lookup ${props.className ?? ""}`} ref={ref} value={value} allowClear style={{ width: "100%", ...props.style }}
    virtual={props.virtual ?? false}
    placeholder={placeholder} options={text.trim() !== keyword ? [] : options} loading={searching}
    labelRender={props.labelRender ?? ((item) => selectedUser && item.value === value ? `${selectedUser.email || "이메일 없음"} · #${value}` : item.label ?? `유저 #${item.value}`)}
    showSearch={{ filterOption: false, searchValue: text, onSearch: setText }}
    onOpenChange={(next) => { setOpen(next); onOpenChange?.(next); if (!next) setText(""); }}
    onChange={(next) => { setText(""); onChange?.(next); }}
    popupRender={(menu) => <div className="admin-lookup-options">{options.length > 0 && (list.error || exactError) && <div role="alert"><Button size="small" onClick={retry}>일부 검색 실패 · 다시 조회</Button></div>}{props.popupRender ? props.popupRender(menu) : menu}</div>}
    notFoundContent={searching ? <Spin size="small" aria-label="유저 검색 중" /> : list.error || exactError
      ? <Button size="small" onClick={retry}>검색 실패 · 다시 조회</Button>
      : "일치하는 유저가 없습니다."}
  />;
});

export const TenantLookupSelect = forwardRef<GetRef<typeof Select>, LookupProps & { userId?: number; propertyId?: number }>(function TenantLookupSelect(
  { value, onChange, onOpenChange, userId, propertyId, placeholder = "이름·전화번호·호실·임차인 ID 검색", ...props }, ref,
) {
  const [open, setOpen] = useState(false);
  const { text, keyword, setText } = useSearchTerm();
  const params = { page: 1, size: 20, userId, propertyId, keyword: keyword || undefined };
  const list = useQuery({ queryKey: tenantKeys.list(params), queryFn: () => fetchTenants(params), enabled: open });
  const keywordId = /^[1-9]\d*$/.test(keyword) ? optionalPositiveInteger(keyword) : undefined;
  const exactParams = { page: 1, size: 1, userId, propertyId, tenantId: keywordId };
  const exact = useQuery({ queryKey: tenantKeys.list(exactParams), queryFn: () => fetchTenants(exactParams), enabled: open && keywordId !== undefined });
  const selected = useQuery({
    queryKey: tenantKeys.detail(value ?? 0), queryFn: () => fetchTenant(value!), enabled: typeof value === "number",
  });
  const tenants = [...new Map([...(exact.data?.tenants ?? []), ...(list.data?.tenants ?? [])].map((tenant) => [tenant.tenantId, tenant])).values()];
  const options = tenants.map((tenant) => ({
    value: tenant.tenantId, label: `${tenant.name} · ${tenant.phone || "전화번호 없음"} · ${tenant.propertyName || "건물 정보 없음"} ${tenant.roomNumber} · 유저 #${tenant.userId} · 임차인 #${tenant.tenantId}`,
  }));
  if (!text.trim() && typeof value === "number" && !options.some((option) => option.value === value)) {
    const tenant = selected.data;
    options.unshift({ value, label: tenant ? `${tenant.name} · ${tenant.roomNumber} · 임차인 #${value}` : `임차인 #${value}` });
  }
  const exactError = keywordId !== undefined && exact.error;
  const searching = list.isFetching || (keywordId !== undefined && exact.isFetching) || text.trim() !== keyword;
  const retry = () => { void list.refetch(); if (keywordId !== undefined) void exact.refetch(); };
  return <Select<number>
    {...props} className={`admin-entity-lookup ${props.className ?? ""}`} ref={ref} value={value} allowClear style={{ width: "100%", ...props.style }}
    virtual={props.virtual ?? false}
    placeholder={placeholder} options={text.trim() !== keyword ? [] : options} loading={searching}
    labelRender={props.labelRender ?? ((item) => selected.data && item.value === value ? `${selected.data.name} · ${selected.data.roomNumber} · 임차인 #${value}` : item.label ?? `임차인 #${item.value}`)}
    showSearch={{ filterOption: false, searchValue: text, onSearch: setText }}
    onOpenChange={(next) => { setOpen(next); onOpenChange?.(next); if (!next) setText(""); }}
    onChange={(next) => { setText(""); onChange?.(next); }}
    popupRender={(menu) => <div className="admin-lookup-options">{options.length > 0 && (list.error || exactError) && <div role="alert"><Button size="small" onClick={retry}>일부 검색 실패 · 다시 조회</Button></div>}{props.popupRender ? props.popupRender(menu) : menu}</div>}
    notFoundContent={searching ? <Spin size="small" aria-label="임차인 검색 중" /> : list.error || exactError
      ? <Button size="small" onClick={retry}>검색 실패 · 다시 조회</Button>
      : "일치하는 임차인이 없습니다."}
  />;
});
