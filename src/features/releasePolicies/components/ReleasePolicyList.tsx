"use client";

import { Card, Descriptions, Spin, Tag, Typography } from "antd";
import { useReleasePolicies } from "../hooks";
import type { ReleasePolicy } from "../types";

const { Title } = Typography;

const CHANNEL_COLOR: Record<string, string> = {
  PRODUCTION: "green",
  PREVIEW: "blue",
  DEVELOPMENT: "default",
};

function PolicyCard({ policy }: { policy: ReleasePolicy }) {
  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <span>
          {policy.platform}{" "}
          <Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>
        </span>
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

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />;
  }

  return (
    <div>
      <Title level={4}>릴리즈 정책</Title>
      {(data?.releasePolicies ?? []).map((policy) => (
        <PolicyCard key={policy.appReleasePolicyId} policy={policy} />
      ))}
    </div>
  );
}
