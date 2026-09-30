"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Segmented, Space, Spin, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { PagedTable } from "@/components/PagedTable";
import { useContractDocuments } from "@/features/contract-ocr/hooks";
import type {
  ContractDocument,
  ContractDocumentListStatus,
} from "@/features/contract-ocr/types";

import { parseProblemDetail } from "@/lib/api/problem";

const { Title, Text } = Typography;

const STATUS_META = {
  PENDING_REVIEW: { color: "gold", label: "검수 대기" },
  REGISTERED: { color: "green", label: "등록 완료" },
  REJECTED: { color: "red", label: "반려" },
};

function statusTag(record: ContractDocument) {
  const meta = STATUS_META[record.status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function formatDateTime(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : "-";
}

// 탭·페이지 상태를 URL 쿼리에 둔다 — 열람 화면에서 뒤로가기해도 보던 탭이 유지된다.
function ContractOcrPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listStatus: ContractDocumentListStatus =
    searchParams.get("status") === "completed" ? "COMPLETED" : "PENDING";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("size") ?? "20") || 20;
  const { data, isLoading, error, refetch, isRefetching } = useContractDocuments(
    listStatus,
    page,
    pageSize,
  );

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
      render: (_, record) =>
        listStatus === "PENDING" ? (
          <Button type="primary" onClick={() => router.push(`/contract-ocr/${record.documentId}`)}>
            검수
          </Button>
        ) : (
          // 완료 탭에서 들어간 상세만 "목록으로"가 완료 탭으로 복귀한다.
          <Button onClick={() => router.push(`/contract-ocr/${record.documentId}?from=completed`)}>
            열람
          </Button>
        ),
    },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>계약서 관리</Title>}
      extra={
        <Space size={12}>
          <Segmented
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
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Text type="secondary">
          {listStatus === "PENDING"
            ? "원본을 확인해 직접 등록하거나 반려할 수 있습니다. OCR은 검수 화면에서 필요한 경우에만 요청합니다."
            : "등록 또는 반려 결정이 완료된 계약서 목록입니다(최신순). 보관 기간이 지난 원본은 열람할 수 없을 수 있습니다."}
        </Text>
        {error && <Alert type="error" showIcon title={parseProblemDetail(error)?.detail ?? "계약서 목록을 불러오지 못했습니다."} />}
        <PagedTable
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
        />
      </Space>
    </Card>
  );
}

export default function ContractOcrPage() {
  return (
    <Suspense fallback={<Spin style={{ display: "block", textAlign: "center", margin: "80px 0" }} />}>
      <ContractOcrPageContent />
    </Suspense>
  );
}
