import { optionalPositiveInteger } from "@/lib/navigation/listParams";
import type { ContractStatus, ContractType, TenantSearchParams } from "./types";

export const CONTRACT_TYPE_OPTIONS: { label: string; value: ContractType }[] = [
  { label: "주거", value: "ROOM" }, { label: "상가", value: "COMMERCIAL" },
  { label: "주차", value: "PARKING" }, { label: "기타", value: "OTHERS" },
];
export const CONTRACT_STATUS_OPTIONS: { label: string; value: ContractStatus }[] = [
  { label: "시작 전", value: "UPCOMING" }, { label: "진행 중", value: "ACTIVE" }, { label: "종료", value: "ENDED" },
];

export function readTenantFilters(params: Pick<URLSearchParams, "get">, prefix = ""): TenantSearchParams {
  const get = (key: string) => params.get(prefix ? `${prefix}${key[0].toUpperCase()}${key.slice(1)}` : key);
  return {
    keyword: get("keyword")?.trim() || undefined,
    tenantId: optionalPositiveInteger(get("tenantId")),
    propertyId: optionalPositiveInteger(get("propertyId")),
    contractType: CONTRACT_TYPE_OPTIONS.find((option) => option.value === get("contractType"))?.value,
    contractStatus: CONTRACT_STATUS_OPTIONS.find((option) => option.value === get("contractStatus"))?.value,
    notifyEnabled: get("notifyEnabled") === "true" ? true : get("notifyEnabled") === "false" ? false : undefined,
  };
}

export const TENANT_FILTER_KEYS = ["keyword", "tenantId", "propertyId", "contractType", "contractStatus", "notifyEnabled"] as const;
