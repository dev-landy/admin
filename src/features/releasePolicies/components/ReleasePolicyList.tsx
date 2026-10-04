"use client";

import { useState } from "react";
import { Button, Card, Descriptions, Empty, Grid, Spin, Tag } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/format/date";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { CHANNEL_COLOR } from "../channel";
import { useReleasePolicies } from "../hooks";
import type { ReleasePolicy } from "../types";
import { ReleasePolicyEditModal } from "./ReleasePolicyEditModal";

function PolicyCard({ policy, onEdit }: { policy: ReleasePolicy; onEdit: () => void }) {
  const screens = Grid.useBreakpoint();
  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <span>
          {policy.platform}{" "}
          <Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>
        </span>
      }
      // 목록이 카드라 액션 열 대신 카드 헤더에 수정 버튼을 둔다.
      extra={
        <Button size="small" onClick={onEdit}>
          수정
        </Button>
      }
    >
      <Descriptions layout={screens.md ? "horizontal" : "vertical"} column={{ xs: 1, md: 2 }} bordered size="small" items={[
        { key: "latestVersion", label: "최신 버전", children: `${policy.latestVersion} (#${policy.latestBuildNumber})` },
        { key: "minimum", label: "최소 지원 빌드", children: `#${policy.minSupportedBuildNumber}` },
        { key: "store", label: "스토어 URL", span: "filled", children: <a href={policy.storeUrl} target="_blank" rel="noreferrer" style={{ overflowWrap: "anywhere" }}>{policy.storeUrl} ↗</a> },
        { key: "forceTitle", label: "강제 업데이트 제목", children: policy.forceUpdateTitle },
        { key: "forceMessage", label: "강제 업데이트 메시지", children: policy.forceUpdateMessage },
        { key: "softTitle", label: "소프트 업데이트 제목", children: policy.softUpdateTitle },
        { key: "softMessage", label: "소프트 업데이트 메시지", children: policy.softUpdateMessage },
        { key: "createdAt", label: "생성일", children: formatDateTime(policy.createdAt) },
        { key: "updatedAt", label: "수정일", children: formatDateTime(policy.updatedAt) },
      ]} />
    </Card>
  );
}

export function ReleasePolicyList() {
  const { data, isLoading, error, isFetching, refetch } = useReleasePolicies();
  const [editing, setEditing] = useState<ReleasePolicy | null>(null);

  return (
    <div>
      <PageHeader title="릴리즈 정책" description="플랫폼과 배포 채널별 최신 버전과 강제 업데이트 기준을 관리합니다." extra={<Button loading={isFetching} onClick={() => refetch()}>새로고침</Button>} />
      <QueryErrorAlert error={error} title="릴리즈 정책을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {isLoading && <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 40 }} />}
      {!isLoading && !error && data?.releasePolicies.length === 0 && <Empty description="등록된 릴리즈 정책이 없습니다." />}
      {(data?.releasePolicies ?? []).map((policy) => (
        <PolicyCard
          key={policy.appReleasePolicyId}
          policy={policy}
          onEdit={() => setEditing(policy)}
        />
      ))}
      <ReleasePolicyEditModal policy={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
