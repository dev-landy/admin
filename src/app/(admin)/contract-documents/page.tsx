"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { RefreshButton } from "@/components/RefreshButton";

import { FilterMore } from "@/components/FilterMore";
import { RecordCard } from "@/components/RecordCard";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Collapse, Descriptions, Form, Input, Select, Segmented, Space, Spin, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import dayjs, { type Dayjs } from "dayjs";
import { UserLookupSelect, TenantLookupSelect } from "@/components/EntityLookupSelect";
import { PropertyLookupSelect } from "@/features/properties/components/PropertyLookupSelect";
import { FilterDateRange } from "@/components/FilterDateRange";
import { FilterSummary } from "@/components/FilterSummary";
import { RelatedPageBack } from "@/components/RelatedPageBack";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { PagedTable } from "@/components/PagedTable";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useContractDocuments } from "@/features/contract-ocr/hooks";
import { ContractStorageRetriesButton } from "@/features/contract-ocr/components/ContractStorageRetriesButton";
import type {
  ContractDocument,
  ContractDocumentListStatus,
} from "@/features/contract-ocr/types";

import { formatDateTime } from "@/lib/format/date";
import { contractListReturnPath, contractListFilters, contractReviewPath } from "@/features/contract-ocr/navigation";

const { Text } = Typography;

const STATUS_META = {
  PENDING_REVIEW: { color: "gold", label: "검수 대기" },
  REGISTERED: { color: "green", label: "등록 완료" },
  REJECTED: { color: "red", label: "반려" },
};

function statusTag(record: ContractDocument) {
  const meta = STATUS_META[record.status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

// 탭·페이지 상태를 URL 쿼리에 둔다 — 열람 화면에서 뒤로가기해도 보던 탭이 유지된다.
function ContractOcrPageContent() {
  const [filterForm] = Form.useForm();
  const draftUserId: number | undefined = Form.useWatch("userId", filterForm);
  const draftPropertyId: number | undefined = Form.useWatch("propertyId", filterForm);
  const router = useRouter();
  const searchParams = useSearchParams();
  const listPath = contractListReturnPath(`/contract-documents?${searchParams.toString()}`);
  const listParams = new URLSearchParams(listPath.split("?")[1]);
  const listStatus: ContractDocumentListStatus =
    listParams.get("status") === "completed" ? "COMPLETED" : "PENDING";
  const page = Number(listParams.get("page") ?? "1");
  const pageSize = Number(listParams.get("size") ?? "20");
  const filters = contractListFilters(listParams);
  const { userId, propertyId, tenantId, uploadId, documentStatus, createdFrom, createdTo, updatedFrom, updatedTo } = filters;
  useEffect(() => {
    filterForm.setFieldsValue({ userId, propertyId, tenantId, uploadId, documentStatus,
      createdRange: createdFrom || createdTo ? [createdFrom ? dayjs(createdFrom) : null, createdTo ? dayjs(createdTo) : null] : undefined,
      updatedRange: updatedFrom || updatedTo ? [updatedFrom ? dayjs(updatedFrom) : null, updatedTo ? dayjs(updatedTo) : null] : undefined });
  }, [filterForm, userId, propertyId, tenantId, uploadId, documentStatus, createdFrom, createdTo, updatedFrom, updatedTo]);
  const sort = useListSort({ fields: [{ value: "createdAt", label: "요청 시각" }, { value: "updatedAt", label: "처리 시각" }, { value: "contractDocumentId", label: "등록 순서" }], defaultField: listStatus === "PENDING" ? "createdAt" : "updatedAt", defaultDirection: listStatus === "PENDING" ? "asc" : "desc", navigation: { query: searchParams.toString(), update: navigate } });
  const { data, isLoading, error, refetch, isRefetching } = useContractDocuments(
    listStatus,
    page,
    pageSize, { ...filters, ...sort.requestParams },
  );
  useEffect(() => {
    if (!data || error) return;
    const lastPage = Math.max(1, Math.ceil(data.totalElements / pageSize));
    if (page <= lastPage) return;
    const params = new URLSearchParams(listPath.split("?")[1]);
    params.set("page", String(lastPage));
    router.replace(`/contract-documents?${params.toString()}`);
  }, [data, error, page, pageSize, listPath, router]);

  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  function renderTarget(record: ContractDocument) { return <EntityCell
      primary={<Link href={relatedListPath("/properties", { propertyId: record.propertyId }, listPath)}>{record.propertyName ?? `건물 #${record.propertyId}`}</Link>}
      secondary={record.propertyAddress || undefined}
      meta={<Link href={listDetailPath("/users", record.userId, listPath)}>{record.userEmail ?? `유저 #${record.userId}`}</Link>}
    >
      {record.userPhone && <span className="admin-entity-meta">{record.userPhone}</span>}
      {record.tenantId && <span className="admin-entity-secondary"><Link href={listDetailPath("/tenants", record.tenantId, listPath)}>{record.tenantName ?? `임차인 #${record.tenantId}`}{record.roomNumber ? ` · ${record.roomNumber}호` : ""}</Link></span>}
    </EntityCell>; }
  function renderAction(record: ContractDocument, index: number) { return <RowActions subject={`계약서 ${record.documentId}`} items={[]} primary={<Button size="small" onClick={() => router.push(contractReviewPath(record.documentId, listPath, index))}>{listStatus === "PENDING" ? "검수" : "열람"}</Button>} />; }
  function renderDetails(record: ContractDocument) {
    return <Descriptions size="small" column={{ xs: 1, sm: 2, md: 2 }} items={[
      { key: "document", label: "문서 ID", children: <Text copyable>{record.documentId}</Text> },
      { key: "upload", label: "업로드 ID", children: record.uploadId ? <Text copyable>{record.uploadId}</Text> : "—" },
      { key: "created", label: "요청 시각", children: formatDateTime(record.createdAt) },
      { key: "updated", label: "마지막 처리", children: formatDateTime(record.updatedAt) },
    ]} />;
  }
  const columns: TableColumnsType<ContractDocument> = [
    {
      title: "계약서",
      dataIndex: "documentId",
      width: 220,
      render: (value: string, record) => <EntityCell
        primary={<Text title={value} copyable={{ text: value }}>{value.slice(0, 8)}…{value.slice(-6)}</Text>}
        meta={record.uploadId ? <span title={record.uploadId}>업로드 {record.uploadId.slice(0, 8)}…{record.uploadId.slice(-6)}</span> : undefined}
      />,
    },
    { title: "등록 대상", key: "target", width: 190, render: (_, record) => renderTarget(record) },
    {
      title: "상태",
      key: "status",
      width: 110,
      align: "center",
      render: (_, record) => statusTag(record),
    },
    {
      title: "기록 시각",
      key: "timestamps",
      width: 190,
      render: (_, record) => <EntityCell primary={<>요청 {formatDateTime(record.createdAt)}</>} secondary={listStatus === "COMPLETED" ? <>완료 {formatDateTime(record.updatedAt)}</> : undefined} />,
    },
    {
      title: "작업",
      key: "action",
      width: 120,
      align: "center",
      fixed: "right",
      render: (_, record, index) => renderAction(record, index),
    },
  ];

  const compactColumns: TableColumnsType<ContractDocument> = [
    { title: "등록 대상 · 계약서", key: "target", width: 310, render: (_, record) => <>{renderTarget(record)}<div className="admin-entity-meta">문서 {record.documentId.slice(0, 8)}…{record.documentId.slice(-6)}</div></> },
    { title: "진행 상태 · 요청", key: "status", width: 180, render: (_, record) => <EntityCell primary={statusTag(record)} secondary={formatDateTime(listStatus === "COMPLETED" ? record.updatedAt : record.createdAt)} /> },
    { title: "작업", key: "action", width: 112, align: "right", render: (_, record, index) => renderAction(record, index) },
  ];

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
    <PageHeader title="계약서 관리"
      extra={
        <Space size={12} wrap>
          <RelatedPageBack />
          <Segmented
            aria-label="계약서 처리 상태"
            value={listStatus}
            onChange={(value) =>
              navigate({
                status: value === "PENDING" ? undefined : "completed",
                page: undefined, documentStatus: undefined, updatedFrom: undefined, updatedTo: undefined,
              })
            }
            options={[
              { label: "검수 대기", value: "PENDING" },
              { label: "완료", value: "COMPLETED" },
            ]}
          />
          <RefreshButton loading={isRefetching} onClick={() => refetch()}>
            새로고침
          </RefreshButton>
        </Space>
      }
    />
    <section aria-label="검색 조건과 조회 결과">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Text type="secondary">
          {listStatus === "PENDING"
            ? "원본을 확인해 직접 등록하거나 반려할 수 있습니다. OCR은 검수 화면에서 필요한 경우에만 요청합니다."
            : "등록 또는 반려 결정이 완료된 계약서 목록입니다(최신순). 보관 기간이 지난 원본은 열람할 수 없을 수 있습니다."}
        </Text>
        <FilterSection><Form form={filterForm} name="contract-list-filters" onValuesChange={(changes) => { if ("userId" in changes) filterForm.setFieldsValue({ propertyId: undefined, tenantId: undefined }); else if ("propertyId" in changes) filterForm.setFieldValue("tenantId", undefined); }} layout="vertical" className="admin-filter-bar"
          onFinish={(values: typeof filters & { createdRange?: [Dayjs | null, Dayjs | null]; updatedRange?: [Dayjs | null, Dayjs | null] }) => {
            const { createdRange, updatedRange, ...rest } = values;
            const changes = { ...rest, createdFrom: createdRange?.[0]?.format("YYYY-MM-DD"), createdTo: createdRange?.[1]?.format("YYYY-MM-DD"), updatedFrom: updatedRange?.[0]?.format("YYYY-MM-DD"), updatedTo: updatedRange?.[1]?.format("YYYY-MM-DD") };
            navigate({ page: "1", ...Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value === undefined || value === null || value === "" ? undefined : String(value).trim()])) });
          }}>
          <Form.Item name="userId" label="유저"><UserLookupSelect style={{ minWidth: 230 }} /></Form.Item>
          <Form.Item name="propertyId" label="건물"><PropertyLookupSelect userId={draftUserId} /></Form.Item>
          <Form.Item name="tenantId" label="임차인"><TenantLookupSelect userId={draftUserId} propertyId={draftPropertyId} style={{ minWidth: 230 }} /></Form.Item>
          <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.resetFields(); filterForm.setFieldsValue(Object.fromEntries([...Object.keys(filters), "createdRange", "updatedRange"].map((key) => [key, undefined]))); navigate({ page: "1", ...Object.fromEntries(Object.keys(filters).map((key) => [key, undefined])) }); }}>초기화</Button></Space></FilterActions>
          <FilterMore><Form.Item name="uploadId" label="업로드 ID" rules={[{ pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: "UUID 형식의 업로드 ID를 입력하세요." }]}><Input allowClear placeholder="동일 업로드의 문서 조회" /></Form.Item>
          <Form.Item name="createdRange" label="요청일"><FilterDateRange form={filterForm} name="createdRange" /></Form.Item>
          {listStatus === "COMPLETED" && <>
            <Form.Item name="documentStatus" label="처리 결과"><Select allowClear options={[{ label: "등록 완료", value: "REGISTERED" }, { label: "반려", value: "REJECTED" }]} style={{ minWidth: 120 }} /></Form.Item>
            <Form.Item name="updatedRange" label="처리 완료일"><FilterDateRange form={filterForm} name="updatedRange" /></Form.Item>
          </>}
          </FilterMore>

        </Form></FilterSection>
        <details className="admin-direct-open"><summary>문서 ID로 바로 열기</summary><Form layout="vertical" className="admin-direct-open-form" name="document-direct-open" onFinish={(values: { documentId: string }) => router.push(contractReviewPath(values.documentId.trim(), listPath))}>
          <Form.Item name="documentId" label="문서 ID" rules={[{ required: true, pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: "UUID 형식의 문서 ID를 입력하세요." }]}><Input placeholder="문서 ID로 바로 열기" /></Form.Item>
          <FilterActions><Button htmlType="submit">문서 열기</Button></FilterActions>
        </Form></details>
        <FilterSummary filters={Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => ({
          label: ({ userId: "유저", propertyId: "건물", tenantId: "임차인", uploadId: "업로드 ID", documentStatus: "처리 결과", createdFrom: "요청 시작일", createdTo: "요청 종료일", updatedFrom: "완료 시작일", updatedTo: "완료 종료일" } as Record<string, string>)[key],
          value: key === "documentStatus" ? value === "REGISTERED" ? "등록 완료" : "반려" : ["userId", "propertyId", "tenantId"].includes(key) ? `#${value}` : String(value), onRemove: () => navigate({ page: "1", [key]: undefined }),
        }))} onReset={() => navigate({ page: "1", ...Object.fromEntries(Object.keys(filters).map((key) => [key, undefined])) })} />
        <QueryErrorAlert error={error} title="계약서 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isRefetching} hasData={data !== undefined} />
        {(!error || data) && <PagedTable sortControl={sort.control}
          columns={listStatus === "PENDING" ? [columns[1], columns[0], columns[3], columns[4]] : [columns[1], columns[0], columns[2], columns[3], columns[4]]} compactColumns={compactColumns} renderCompactDetails={renderDetails}
          columnSizing={{
            target: { min: 360, preferred: 620, grow: 2 },
            timestamps: { min: 220, preferred: 260, grow: 0.5 },
            action: { min: 120 },
          }}
          renderCard={(record, index) => <RecordCard title={renderTarget(record)} meta={`문서 ${record.documentId.slice(0, 8)}…${record.documentId.slice(-6)}`} fields={[
            { label: "처리 상태", value: statusTag(record) },
            { label: listStatus === "COMPLETED" ? "완료 시각" : "요청 시각", value: formatDateTime(listStatus === "COMPLETED" ? record.updatedAt : record.createdAt) },
          ]} details={renderDetails(record)} actions={renderAction(record, index)} ariaLabel={`계약서 ${record.documentId}`} />}
          dataSource={data?.documents ?? []}
          loading={isLoading}
          page={page}
          pageSize={pageSize}
          total={data?.totalElements ?? 0}
          onPageChange={(nextPage, nextSize) =>
            navigate({
              page: nextSize === pageSize ? String(nextPage) : "1",
              size: String(nextSize),
            })
          }
          rowKey="documentId"
          ariaLabel="계약서 목록"
          emptyText={Object.values(filters).some((value) => value !== undefined)
            ? "조건에 맞는 계약서가 없습니다. 필터를 해제하거나 다른 조건으로 조회하세요."
            : listStatus === "PENDING" ? "검수 대기 중인 계약서가 없습니다." : "처리가 완료된 계약서가 없습니다."}
        />}
        <Collapse
          size="small"
          items={[{
            key: "operations",
            label: "운영 도구",
            children: <Space orientation="vertical" size={12}>
              <Text type="secondary">
                전체 계약서의 파일 보관·삭제가 실패했거나 이전 처리 흐름이 멈췄을 때 사용합니다.
                임차인 등록과 결과 알림이 이어질 수 있습니다.
              </Text>
              <ContractStorageRetriesButton />
            </Space>,
          }]}
        />
      </Space>
    </section>
    </Space>
  );
}

export default function ContractOcrPage() {
  return (
    <Suspense fallback={<Spin style={{ display: "block", textAlign: "center", margin: "80px 0" }} />}>
      <ContractOcrPageContent />
    </Suspense>
  );
}
