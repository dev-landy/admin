"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTenant } from "../api";
import { tenantKeys } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";

// 목록 행은 전화번호가 마스킹된 요약이라, 수정 진입 시 상세를 조회해 드로어를 연다.
// 수정할 때만 마운트해서 사용하는 컴포넌트다.
export function TenantEditDrawerById({
  tenantId,
  onClose,
}: {
  tenantId: number;
  onClose: () => void;
}) {
  const { data } = useQuery({
    queryKey: tenantKeys.detail(tenantId),
    queryFn: () => fetchTenant(tenantId),
  });

  if (!data) {
    return null;
  }
  return <TenantEditDrawer tenant={data} open onClose={onClose} />;
}
