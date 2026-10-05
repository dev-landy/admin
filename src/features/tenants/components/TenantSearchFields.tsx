"use client";

import type { ReactNode } from "react";
import { Form, Input, InputNumber, Select } from "antd";
import { FilterMore } from "@/components/FilterMore";
import { PropertyLookupSelect } from "@/features/properties/components/PropertyLookupSelect";
import { CONTRACT_STATUS_OPTIONS, CONTRACT_TYPE_OPTIONS } from "../listFilters";

export function TenantSearchFields({ showProperty = true, userId, actions, additionalFilters }: { showProperty?: boolean; userId?: number; actions?: ReactNode; additionalFilters?: ReactNode }) {
  return <>
    <Form.Item name="keyword" label="이름·전화번호·호실" className="admin-filter-field admin-filter-keyword"><Input allowClear placeholder="전체 임차인에서 검색" /></Form.Item>
    {showProperty && <Form.Item name="propertyId" label="건물" className="admin-filter-field admin-entity-lookup"><PropertyLookupSelect userId={userId} /></Form.Item>}
    <Form.Item name="contractStatus" label="계약 상태" className="admin-filter-field"><Select allowClear placeholder="전체" options={CONTRACT_STATUS_OPTIONS} /></Form.Item>
    {actions}
    <FilterMore>
      <Form.Item name="tenantId" label="임차인 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item>
      <Form.Item name="contractType" label="계약 유형" className="admin-filter-field"><Select allowClear placeholder="전체" options={CONTRACT_TYPE_OPTIONS} /></Form.Item>
      <Form.Item name="notifyEnabled" label="임대인 알림" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "활성", value: true }, { label: "비활성", value: false }]} /></Form.Item>
      {additionalFilters}
    </FilterMore>
  </>;
}
