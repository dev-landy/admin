"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Collapse, Segmented, Space, Spin, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { PagedTable } from "@/components/PagedTable";
import { useContractDocuments } from "@/features/contract-ocr/hooks";
import { ContractStorageRetriesButton } from "@/features/contract-ocr/components/ContractStorageRetriesButton";
import type {
  ContractDocument,
  ContractDocumentListStatus,
} from "@/features/contract-ocr/types";

import { formatDateTime } from "@/lib/format/date";
import { contractListReturnPath, contractReviewPath } from "@/features/contract-ocr/navigation";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const listPath = contractListReturnPath(`/contract-ocr?${searchParams.toString()}`);
  const listParams = new URLSearchParams(listPath.split("?")[1]);
  const listStatus: ContractDocumentListStatus =
    listParams.get("status") === "completed" ? "COMPLETED" : "PENDING";
  const page = Number(listParams.get("page") ?? "1");
  const pageSize = Number(listParams.get("size") ?? "20");
  const { data, isLoading, error, refetch, isRefetching } = useContractDocuments(
    listStatus,
    page,
    pageSize,
  );
  useEffect(() => {
    if (!data || error) return;
    const lastPage = Math.max(1, Math.ceil(data.totalElements / pageSize));
    if (page <= lastPage) return;
    const params = new URLSearchParams(listPath.split("?")[1]);
    params.set("page", String(lastPage));
    router.replace(`/contract-ocr?${params.toString()}`);
  }, [data, error, page, pageSize, listPath, router]);

  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  const columns: TableColumnsType<ContractDocument> = [
    {
      title: "문서 ID",
      dataIndex: "documentId",
      render: (value: string) => <Text copyable={{ text: value }}>{value.slice(0, 8)}…</Text>,
    },
    { title: "유저 ID", dataIndex: "userId", width: 100, align: "center" },
    { title: "건물 ID", dataIndex: "propertyId", width: 100, align: "center" },
    {
      title: "상태",
      key: "status",
      width: 110,
      align: "center",
      render: (_, record) => statusTag(record),
    },
    {
      title: "요청일",
      dataIndex: "createdAt",
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
    ...(listStatus === "COMPLETED"
      ? [
          {
            title: "처리 완료",
            dataIndex: "updatedAt",
            width: 150,
            render: (value: string) => formatDateTime(value),
          } satisfies TableColumnsType<ContractDocument>[number],
        ]
      : []),
    {
      title: "동작",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record, index) =>
        listStatus === "PENDING" ? (
          <Button type="primary" onClick={() => router.push(contractReviewPath(record.documentId, listPath, index))}>
            검수
          </Button>
        ) : (
          <Button onClick={() => router.push(contractReviewPath(record.documentId, listPath, index))}>
            열람
          </Button>
        ),
    },
  ];

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
    <PageHeader title="계약서 관리"
      extra={
        <Space size={12} wrap>
          <Segmented
            aria-label="계약서 처리 상태"
            value={listStatus}
            onChange={(value) =>
              navigate({
                status: value === "PENDING" ? undefined : "completed",
                page: undefined,
              })
            }
            options={[
              { label: "검수 대기", value: "PENDING" },
              { label: "완료", value: "COMPLETED" },
            ]}
          />
          <Button icon={<ReloadOutlined />} loading={isRefetching} onClick={() => refetch()}>
            새로고침
          </Button>
        </Space>
      }
    />
    <Card>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Text type="secondary">
          {listStatus === "PENDING"
            ? "원본을 확인해 직접 등록하거나 반려할 수 있습니다. OCR은 검수 화면에서 필요한 경우에만 요청합니다."
            : "등록 또는 반려 결정이 완료된 계약서 목록입니다(최신순). 보관 기간이 지난 원본은 열람할 수 없을 수 있습니다."}
        </Text>
        <QueryErrorAlert error={error} title="계약서 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isRefetching} hasData={data !== undefined} />
        {(!error || data) && <PagedTable
          columns={columns}
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
          emptyText={listStatus === "PENDING" ? "검수 대기 중인 계약서가 없습니다." : "처리가 완료된 계약서가 없습니다."}
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
    </Card>
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
