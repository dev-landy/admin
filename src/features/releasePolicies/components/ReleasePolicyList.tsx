"use client";

import { useState } from "react";
import { Button, Card, Descriptions, Spin, Tag, Typography } from "antd";
import { CHANNEL_COLOR } from "../channel";
import { useReleasePolicies } from "../hooks";
import type { ReleasePolicy } from "../types";
import { ReleasePolicyEditModal } from "./ReleasePolicyEditModal";

const { Title } = Typography;

function PolicyCard({ policy, onEdit }: { policy: ReleasePolicy; onEdit: () => void }) {
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
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="최신 버전">{policy.latestVersion} (#{policy.latestBuildNumber})</Descriptions.Item>
        <Descriptions.Item label="최소 지원 빌드">#{policy.minSupportedBuildNumber}</Descriptions.Item>
        <Descriptions.Item label="스토어 URL" span={2}>
          <a href={policy.storeUrl} target="_blank" rel="noreferrer">{policy.storeUrl}</a>
        </Descriptions.Item>
        <Descriptions.Item label="강제 업데이트 제목">{policy.forceUpdateTitle}</Descriptions.Item>
        <Descriptions.Item label="강제 업데이트 메시지">{policy.forceUpdateMessage}</Descriptions.Item>
        <Descriptions.Item label="소프트 업데이트 제목">{policy.softUpdateTitle}</Descriptions.Item>
        <Descriptions.Item label="소프트 업데이트 메시지">{policy.softUpdateMessage}</Descriptions.Item>
        <Descriptions.Item label="생성일">{policy.createdAt}</Descriptions.Item>
        <Descriptions.Item label="수정일">{policy.updatedAt}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

export function ReleasePolicyList() {
  const { data, isLoading } = useReleasePolicies();
  const [editing, setEditing] = useState<ReleasePolicy | null>(null);

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />;
  }

  return (
    <div>
      <Title level={4}>릴리즈 정책</Title>
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
