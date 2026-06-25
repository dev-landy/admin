"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { useFeedbacks } from "@/features/feedbacks/hooks";
import { FeedbackTable } from "@/features/feedbacks/components/FeedbackTable";

const { Title } = Typography;

function FeedbacksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");

  const { data, isLoading } = useFeedbacks({ page, size });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>피드백</Title>}>
      <FeedbackTable
        data={data?.feedbacks ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
      />
    </Card>
  );
}

export default function FeedbacksPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <FeedbacksPageContent />
    </Suspense>
  );
}
