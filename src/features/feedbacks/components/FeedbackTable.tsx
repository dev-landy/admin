"use client";

import type { TableColumnsType } from "antd";
import { PagedTable } from "@/components/PagedTable";
import type { Feedback } from "../types";

const columns: TableColumnsType<Feedback> = [
  { title: "피드백 ID", dataIndex: "feedbackId", width: 100 },
  { title: "유저 ID", dataIndex: "userId", width: 90 },
  { title: "내용", dataIndex: "content", ellipsis: true },
  { title: "작성일", dataIndex: "createdAt", width: 180 },
];

type Props = {
  data: Feedback[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
};

export function FeedbackTable({ data, loading, page, pageSize, total, onPageChange }: Props) {
  return (
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      rowKey={(r) => String(r.feedbackId)}
    />
  );
}
