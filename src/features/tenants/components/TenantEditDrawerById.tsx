"use client";

import { useQuery } from "@tanstack/react-query";
import { Drawer, Spin } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { fetchTenant } from "../api";
import { tenantKeys } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";

// 수정에 필요한 모든 필드와 최신 계약 값을 상세에서 확보한 뒤 드로어를 연다.
// 수정할 때만 마운트해서 사용하는 컴포넌트다.
export function TenantEditDrawerById({
  tenantId,
  onClose,
}: {
  tenantId: number;
  onClose: () => void;
}) {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: tenantKeys.detail(tenantId),
    queryFn: () => fetchTenant(tenantId),
  });

  if (!data) {
    return <Drawer title="임차인 정보 수정" open onClose={onClose} size="min(480px, 100vw)">
      {isLoading && <Spin aria-label="임차인 정보를 불러오는 중" />}
      <QueryErrorAlert error={error} title="임차인 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} />
    </Drawer>;
  }
  return <TenantEditDrawer tenant={data} open onClose={onClose}
    queryError={<QueryErrorAlert error={error} title="임차인 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData />} />;
}
