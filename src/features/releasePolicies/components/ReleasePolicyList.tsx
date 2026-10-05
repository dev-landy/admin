"use client";

import { RefreshButton } from "@/components/RefreshButton";

import { useEffect, useState } from "react";
import { useListSort } from "@/lib/navigation/useListSort";
import { useRouter, useSearchParams } from "next/navigation";
import { positiveInteger } from "@/lib/navigation/listParams";
import { FilterSummary } from "@/components/FilterSummary";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { Button, Card, Descriptions, Drawer, Form, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useAdminViewport } from "@/components/useAdminViewport";
import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/format/date";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { CHANNEL_COLOR } from "../channel";
import { useReleasePolicies } from "../hooks";
import type { ReleasePolicy } from "../types";
import { ReleasePolicyEditModal } from "./ReleasePolicyEditModal";
import styles from "./ReleasePolicyList.module.css";

const RELEASE_POLICY_COLUMN_SIZING = {
  policy: { min: 220, preferred: 260, grow: 1 },
  version: { min: 180, preferred: 280, grow: 1 },
  minSupportedBuildNumber: { min: 170 },
  updatedAt: { min: 210, preferred: 250, grow: 0.5 },
  actions: { min: 144 },
} as const;

function PolicyCard({ policy, onEdit }: { policy: ReleasePolicy; onEdit: () => void }) {
  const viewport = useAdminViewport();
  return (
    <Card
      className={styles.detailCard}
      style={{ marginBottom: 16 }}
      title={
        <span>
          {policy.platform}{" "}
          <Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>
        </span>
      }
      // 목록이 카드라 액션 열 대신 카드 헤더에 수정 버튼을 둔다.
      extra={
        <RowActions subject={`${policy.platform} ${policy.channel}`} primary={<Button size="small" onClick={onEdit}>수정</Button>} items={[]} />
      }
    >
      <Descriptions layout={viewport === "mobile" ? "vertical" : "horizontal"} column={{ xs: 1, md: 2 }} bordered size="small" items={[
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1);
  const pageSize = positiveInteger(searchParams.get("size"), 20, 100);
  const [editing, setEditing] = useState<ReleasePolicy | null>(null);
  const [selected, setSelected] = useState<ReleasePolicy | null>(null);
  const platformRaw = searchParams.get("platform");
  const channelRaw = searchParams.get("channel");
  const platform = platformRaw === "ANDROID" || platformRaw === "IOS" ? platformRaw : undefined;
  const channel = channelRaw === "DEVELOPMENT" || channelRaw === "PREVIEW" || channelRaw === "PRODUCTION" ? channelRaw : undefined;
  function updateQuery(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) { if (value === undefined) params.delete(key); else params.set(key, value); }
    router.push(`?${params.toString()}`);
  }
  const sort = useListSort({ fields: [{ value: "appReleasePolicyId", label: "정책 ID" }, { value: "createdAt", label: "등록 시각" }, { value: "updatedAt", label: "수정 시각" }], defaultField: "appReleasePolicyId", navigation: { query: searchParams.toString(), update: updateQuery } });
  const { data, isLoading, error, isFetching, refetch } = useReleasePolicies({ page, size: pageSize, platform, channel, ...sort.requestParams });
  const policies = data?.releasePolicies ?? [];
  const total = data?.totalElements ?? 0;
  useEffect(() => {
    if (!data || error || isFetching || typeof data.totalElements !== "number") return;
    const lastPage = Math.max(1, Math.ceil(data.totalElements / pageSize));
    if (page > lastPage) {
      const params = new URLSearchParams(searchParams.toString()); params.set("page", String(lastPage)); router.replace(`?${params.toString()}`);
    }
  }, [data, error, isFetching, page, pageSize, searchParams, router]);

  const renderActions = (policy: ReleasePolicy) => <RowActions subject={`${policy.platform} ${policy.channel}`}
    primary={<Button size="small" onClick={() => setEditing(policy)}>수정</Button>}
    items={[{ key: "detail", label: "정책 상세", onClick: () => setSelected(policy) }]} />;
  const renderDetails = (policy: ReleasePolicy) => <Descriptions column={1} size="small" layout="vertical" items={[
    { key: "id", label: "정책 ID", children: policy.appReleasePolicyId },
    { key: "store", label: "스토어 URL", children: <a href={policy.storeUrl} target="_blank" rel="noreferrer" style={{ overflowWrap: "anywhere" }}>{policy.storeUrl} ↗</a> },
    { key: "force", label: "강제 업데이트 안내", children: <><strong>{policy.forceUpdateTitle}</strong><div>{policy.forceUpdateMessage}</div></> },
    { key: "soft", label: "선택 업데이트 안내", children: <><strong>{policy.softUpdateTitle}</strong><div>{policy.softUpdateMessage}</div></> },
    { key: "created", label: "생성일", children: formatDateTime(policy.createdAt) },
    { key: "updated", label: "수정일", children: formatDateTime(policy.updatedAt) },
  ]} />;
  const columns: TableColumnsType<ReleasePolicy> = [
    { title: "플랫폼 · 채널", key: "policy", width: 220,
      render: (_, policy) => <EntityCell primary={policy.platform} secondary={<Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>} meta={`정책 #${policy.appReleasePolicyId}`} /> },
    { title: "최신 버전", key: "version", width: 180,
      render: (_, policy) => <EntityCell primary={policy.latestVersion} secondary={`빌드 #${policy.latestBuildNumber}`} /> },
    { title: "최소 지원 빌드", dataIndex: "minSupportedBuildNumber", width: 170,
      render: (value: number) => <span className="admin-numeric">#{value}</span> },
    { title: "수정일", dataIndex: "updatedAt", width: 210, render: (value: string) => formatDateTime(value) },
    { title: "작업", key: "actions", width: 144, fixed: "right",
      render: (_, policy) => renderActions(policy) },
  ];

  const compactColumns: TableColumnsType<ReleasePolicy> = [
    { title: "플랫폼 · 채널", key: "policy", width: 220, render: (_, policy) => <EntityCell primary={policy.platform} secondary={<Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>} /> },
    { title: "버전 · 지원 기준", key: "version", width: 180, render: (_, policy) => <EntityCell primary={`${policy.latestVersion} · 빌드 #${policy.latestBuildNumber}`} secondary={`최소 지원 #${policy.minSupportedBuildNumber}`} /> },
    { title: "작업", key: "actions", width: 144, render: (_, policy) => renderActions(policy) },
  ];

  return (
    <div>
      <PageHeader title="릴리즈 정책" description="플랫폼과 배포 채널별 최신 버전과 강제 업데이트 기준을 관리합니다." extra={<RefreshButton loading={isFetching} onClick={() => refetch()}>새로고침</RefreshButton>} />
      <FilterSection><Form layout="vertical" className="admin-filter-bar">
        <Form.Item label="플랫폼" htmlFor="release-policy-platform"><Select id="release-policy-platform" value={platform} onChange={(value) => updateQuery({ platform: value, page: "1" })} allowClear placeholder="전체" options={[{ label: "ANDROID", value: "ANDROID" }, { label: "IOS", value: "IOS" }]} style={{ minWidth: 140 }} /></Form.Item>
        <Form.Item label="배포 채널" htmlFor="release-policy-channel"><Select id="release-policy-channel" value={channel} onChange={(value) => updateQuery({ channel: value, page: "1" })} allowClear placeholder="전체" options={["DEVELOPMENT", "PREVIEW", "PRODUCTION"].map((value) => ({ label: value, value }))} style={{ minWidth: 140 }} /></Form.Item>
        <FilterActions><Button onClick={() => updateQuery({ platform: undefined, channel: undefined, page: "1" })}>초기화</Button></FilterActions>
      </Form></FilterSection>
      <FilterSummary filters={[...(platform ? [{ label: "플랫폼", value: platform, onRemove: () => updateQuery({ platform: undefined, page: "1" }) }] : []), ...(channel ? [{ label: "배포 채널", value: channel, onRemove: () => updateQuery({ channel: undefined, page: "1" }) }] : [])]} onReset={() => updateQuery({ platform: undefined, channel: undefined, page: "1" })} />
      <QueryErrorAlert error={error} title="릴리즈 정책을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data !== undefined) && <Card>
        <PagedTable sortControl={sort.control} columns={columns} compactColumns={compactColumns} columnSizing={RELEASE_POLICY_COLUMN_SIZING} renderCompactDetails={renderDetails}
          renderCard={(policy) => <RecordCard title={policy.platform}
            ariaLabel={`릴리즈 정책 ${policy.platform} ${policy.channel}`} meta={<Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>}
            fields={[{ label: "최신 버전", value: `${policy.latestVersion} · 빌드 #${policy.latestBuildNumber}` }, { label: "최소 지원 빌드", value: `#${policy.minSupportedBuildNumber}` }, { label: "수정일", value: formatDateTime(policy.updatedAt) }]}
            actions={renderActions(policy)} details={renderDetails(policy)} />}
          dataSource={policies} loading={isLoading} rowKey="appReleasePolicyId"
          page={page} pageSize={pageSize} total={total} onPageChange={(nextPage, nextSize) => updateQuery({ page: String(nextSize === pageSize ? nextPage : 1), size: String(nextSize) })}
          emptyText={platform || channel ? "조건에 맞는 릴리즈 정책이 없습니다." : "등록된 릴리즈 정책이 없습니다."} ariaLabel="릴리즈 정책 목록" />
      </Card>}
      <Drawer title="릴리즈 정책 상세" open={selected !== null} onClose={() => setSelected(null)} size="min(680px, 100vw)" destroyOnHidden>
        {selected && <PolicyCard policy={selected} onEdit={() => { setEditing(selected); setSelected(null); }} />}
      </Drawer>
      <ReleasePolicyEditModal policy={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
