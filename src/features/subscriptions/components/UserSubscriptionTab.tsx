"use client";

import { useRef, useState } from "react";
import { Alert, App, Button, Card, Collapse, Descriptions, Empty, Flex, Select, Space, Spin, Tag, Typography } from "antd";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatSubscriptionTime as time } from "../format";
import { useSubscription, useSubscriptionOperations } from "../hooks";
import type { SubscriptionEnvironment, SubscriptionGrant } from "../types";
import { SubscriptionGrantDialog } from "./SubscriptionGrantDialog";
import { SubscriptionRevokeDialog } from "./SubscriptionRevokeDialog";

const environmentLabel = (value: SubscriptionEnvironment) => value === "PRODUCTION" ? "운영" : "Sandbox";
const sourceLabels: Record<string, string> = { REVENUECAT: "스토어 구독", SERVER_GRANT: "서버 지급" };
const renewalLabels: Record<string, string> = { WILL_RENEW: "자동 갱신 예정", WILL_NOT_RENEW: "자동 갱신 해제", UNKNOWN: "갱신 여부 미확인" };

export function UserSubscriptionTab({ userId, email, readOnly = false }: { userId: number; email: string; readOnly?: boolean }) {
  const query = useSubscription(userId);
  const { grant, revoke, reconcile } = useSubscriptionOperations(userId);
  const { notification } = App.useApp();
  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<SubscriptionGrant | null>(null);
  const [environment, setEnvironment] = useState<SubscriptionEnvironment>("PRODUCTION");
  const reconciling = useRef(false);
  const data = query.data;
  const busy = grant.isPending || revoke.isPending || reconcile.isPending;
  const disabled = readOnly || Boolean(data?.withdrawnAt) || !data || query.isError;
  async function requestReconcile() {
    if (disabled || busy || reconciling.current) return;
    reconciling.current = true;
    try {
      await reconcile.mutateAsync(environment);
      notification.success({ title: "스토어 재확인을 요청했습니다.", description: "실제 구독 반영 결과는 아래 동기화 상태에서 확인하세요." });
    } catch (error) {
      notification.error({ title: "재확인 요청 실패", description: parseProblemDetail(error)?.detail ?? "다시 시도해 주세요." });
    } finally { reconciling.current = false; }
  }
  return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
    <QueryErrorAlert error={query.error} title="구독 정보를 불러오지 못했습니다." hasData={Boolean(data)} onRetry={query.refetch} isRetrying={query.isFetching} />
    {query.isPending && <Spin aria-label="구독 정보를 불러오는 중" />}
    {data && <>
      <Card title="현재 Pro 혜택" extra={<Button onClick={() => { void query.refetch(); }} loading={query.isFetching} disabled={busy}>새로고침</Button>}>
        <Descriptions column={1} size="small" items={[
          { key: "access", label: "이용 상태", children: <Tag color={data.effectiveAccess.active ? "blue" : undefined}>{data.effectiveAccess.active ? "Pro 이용 중" : data.effectiveAccess.tier === "UNKNOWN" ? "혜택 확인 필요" : "기본 이용 중"}</Tag> },
          { key: "end", label: "혜택 종료 (한국 시간)", children: data.effectiveAccess.active ? data.effectiveAccess.permanent ? "기간 제한 없음" : time(data.effectiveAccess.validUntil) : "-" },
          { key: "sources", label: "유효 혜택 근거", children: data.effectiveAccess.sources.map((source) => sourceLabels[source] ?? source).join(", ") || "없음" },
          { key: "verification", label: "검증 상태", children: data.effectiveAccess.verificationState },
          { key: "identity", label: "RevenueCat 회원 ID", children: <Typography.Text copyable style={{ overflowWrap: "anywhere" }}>{data.appUserId}</Typography.Text> },
        ]} />
        {(readOnly || data.withdrawnAt) ? <Alert type="info" showIcon title="탈퇴 계정은 이력 조회만 가능합니다." /> : <Flex gap={8} wrap style={{ marginTop: 16 }}>
          <Button type="primary" disabled={disabled || busy} onClick={() => setGrantOpen(true)}>Pro 혜택 지급</Button>
          <Select aria-label="재확인할 스토어 환경" value={environment} onChange={setEnvironment} disabled={disabled || busy}
            options={[{ value: "PRODUCTION", label: "운영 거래" }, { value: "SANDBOX", label: "Sandbox 거래" }]} />
          <Button disabled={disabled || busy} loading={reconcile.isPending} onClick={() => { void requestReconcile(); }}>스토어 재확인</Button>
        </Flex>}
      </Card>
      <Collapse defaultActiveKey={["stores"]} items={[
        { key: "stores", label: `스토어 구독 (${data.storeSubscriptions.length})`, children: <Space orientation="vertical" style={{ width: "100%" }}>
          {!data.storeSubscriptions.length && <Empty description="스토어 구독 이력이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          {data.storeSubscriptions.map((store) => <Card key={store.id} size="small" title={`${store.store} · ${environmentLabel(store.environment)}`}>
            <Descriptions column={1} size="small" items={[
              { key: "product", label: "상품", children: store.productIdentifier ?? store.productId },
              { key: "plan", label: "요금제", children: store.plan === "MONTHLY" ? "월간" : store.plan === "ANNUAL" ? "연간" : store.plan ?? "미분류" },
              { key: "state", label: "스토어 상태", children: `${store.status} · ${store.active ? "원천 권한 유효" : "원천 권한 없음"}` },
              { key: "renewal", label: "자동 갱신", children: renewalLabels[store.autoRenewalStatus] ?? store.autoRenewalStatus },
              { key: "end", label: "결제 기간 종료 (한국 시간)", children: time(store.currentPeriodEnd) },
              { key: "access", label: "확인된 권한 종료 (한국 시간)", children: time(store.verifiedAccessUntil) },
              { key: "fetched", label: "마지막 조회 (한국 시간)", children: time(store.fetchedAt) },
            ]} />
          </Card>)}
          <Typography.Text type="secondary">Sandbox 원천 권한은 서버에서 허용한 테스트 계정에만 적용됩니다. 실제 이용 여부는 위 ‘현재 Pro 혜택’을 기준으로 확인하세요.</Typography.Text>
        </Space> },
        { key: "grants", label: `서버 지급 이력 (${data.grants.length})`, children: <Space orientation="vertical" style={{ width: "100%" }}>
          {!data.grants.length && <Empty description="서버 지급 이력이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          {data.grants.map((item) => <Card key={item.grantId} size="small" title={`지급 #${item.grantId} · ${item.active ? "이용 중" : item.revokedAt ? "회수됨" : "종료됨"}`}
            extra={item.active && !disabled && <Button danger disabled={busy} onClick={() => setSelectedGrant(item)}>지급 #{item.grantId} 회수</Button>}>
            <Descriptions column={1} size="small" items={[
              { key: "period", label: "기간 (한국 시간)", children: `${time(item.startsAt)} ~ ${item.permanent ? "기간 제한 없음" : time(item.expiresAt)}` },
              { key: "reason", label: "지급 사유", children: item.reason },
              { key: "actor", label: "지급 주체", children: item.createdByAdminId ? `관리자 #${item.createdByAdminId}` : item.createdByOperator ?? item.createdByKind },
              ...(item.revokedAt ? [{ key: "revoked", label: "회수 (한국 시간)", children: `${time(item.revokedAt)} · 관리자 #${item.revokedByAdminId ?? "-"} · ${item.revokeReason ?? "-"}` }] : []),
            ]} />
          </Card>)}
        </Space> },
        { key: "sync", label: "스토어 동기화 상태", children: <Space orientation="vertical" style={{ width: "100%" }}>
          {!data.syncStatuses.length && <Empty description="동기화 이력이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          {data.syncStatuses.map((sync) => <Card key={sync.environment} size="small" title={`${environmentLabel(sync.environment)} · ${sync.state}`}>
            <Descriptions column={1} size="small" items={[
              { key: "generation", label: "반영 / 요청 차수", children: `${sync.appliedGeneration} / ${sync.requestedGeneration}` },
              { key: "last", label: "최근 성공 (한국 시간)", children: time(sync.lastSuccessAt) },
              { key: "next", label: "다음 시도 (한국 시간)", children: time(sync.nextAttemptAt) },
              { key: "error", label: "실패 횟수 / 오류", children: `${sync.attempts} / ${sync.lastErrorCode ?? "없음"}` },
            ]} />
          </Card>)}
        </Space> },
      ]} />
    </>}
    <SubscriptionGrantDialog userId={userId} email={email} open={grantOpen} disabled={disabled || revoke.isPending || reconcile.isPending}
      submit={grant.mutateAsync} onClose={() => setGrantOpen(false)} />
    {selectedGrant && <SubscriptionRevokeDialog key={selectedGrant.grantId} userId={userId} grant={selectedGrant}
      disabled={disabled || grant.isPending || reconcile.isPending} submit={revoke.mutateAsync} onClose={() => setSelectedGrant(null)} />}
  </Space>;
}
