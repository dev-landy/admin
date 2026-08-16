"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Segmented, Space, Spin, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { PagedTable } from "@/components/PagedTable";
import { useContractOcrDocuments } from "@/features/contract-ocr/hooks";
import type {
  ContractOcrDocumentSummary,
  ContractOcrListStatus,
} from "@/features/contract-ocr/types";

const { Title, Text } = Typography;

const STATUS_META: Record<string, { color: string; label: string }> = {
  QUEUED: { color: "gold", label: "대기" },
  PROCESSING: { color: "blue", label: "검수 중" },
  STORING: { color: "geekblue", label: "확정 중" },
  REVIEW_REQUIRED: { color: "orange", label: "재등록 필요" },
  RETRYABLE_FAILED: { color: "volcano", label: "재시도 필요" },
  FINAL_FAILED: { color: "red", label: "인식 불가" },
};

// 자동 등록 흐름에서는 "사용자 결정" 단계가 없으므로 등록 결과를 상태 하나로 합쳐 보여준다.
function statusTag(record: ContractOcrDocumentSummary) {
  if (record.analysisStatus === "FINAL_FAILED") {
    return <Tag color="red">인식 불가</Tag>;
  }
  if (record.decisionStatus === "REGISTERED") {
    return <Tag color="green">등록 완료</Tag>;
  }
  if (record.decisionStatus === "DISCARDED") {
    return <Tag>제외됨</Tag>;
  }
  const meta = STATUS_META[record.analysisStatus] ?? {
    color: "default",
    label: record.analysisStatus,
  };
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
  const listStatus: ContractOcrListStatus =
    searchParams.get("status") === "completed" ? "completed" : "pending";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("size") ?? "20") || 20;
  const { data, isLoading, refetch, isRefetching } = useContractOcrDocuments(
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

  const columns: TableColumnsType<ContractOcrDocumentSummary> = [
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
    ...(listStatus === "completed"
      ? [
          {
            title: "처리 완료",
            dataIndex: "updatedAt",
            width: 150,
            render: (value: string) => formatDateTime(value),
          } satisfies TableColumnsType<ContractOcrDocumentSummary>[number],
        ]
      : []),
    {
      title: "동작",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) =>
        listStatus === "pending" ? (
          <Button type="primary" onClick={() => router.push(`/contract-ocr/${record.documentId}`)}>
            {record.analysisStatus === "REVIEW_REQUIRED"
              ? "재등록"
              : record.analysisStatus === "RETRYABLE_FAILED"
                ? "재시도"
                : "검수"}
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
                status: value === "pending" ? undefined : String(value),
                page: undefined,
              })
            }
            options={[
              { label: "검수 대기", value: "pending" },
              { label: "완료", value: "completed" },
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
          {listStatus === "pending"
            ? "아직 등록 또는 제외 결정이 끝나지 않은 계약서 목록입니다. 재등록·재시도가 필요한 문서도 이 탭에서 처리합니다."
            : "등록 또는 제외 결정이 완료된 계약서 목록입니다(최신순). 원본 이미지는 업로드 7일 후 자동 삭제되어 열람이 안 될 수 있습니다."}
        </Text>
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
