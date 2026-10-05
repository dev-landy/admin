"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { useEffect, useState } from "react";
import { App, Button, Empty, Form, InputNumber, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { formatDateTime } from "@/lib/format/date";
import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions, type RowAction } from "@/components/RowActions";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { FilterSummary } from "@/components/FilterSummary";
import { optionalPositiveInteger } from "@/lib/navigation/listParams";
import { useScopedListState, type ListNavigation } from "@/lib/navigation/useScopedListState";

import { parseProblemDetail } from "@/lib/api/problem";
import {
  useUserFcmTokens,
  useDeactivateFcmToken,
  useUpdateFcmTokenSilentWakeupSubscription,
  useSendFcmTokenSilentMessage,
} from "../hooks";
import type { FcmToken } from "../types";
import { FcmTestSendModal } from "./FcmTestSendModal";

export function UserFcmTab({ userId, navigation, readOnly = false }: { userId: number; navigation?: ListNavigation; readOnly?: boolean }) {
  const { notification } = App.useApp();
  const [filterForm] = Form.useForm();
  const { params, page, size, update } = useScopedListState(navigation, "fcm");
  const platformRaw = params.get("platform");
  const platform = platformRaw === "ANDROID" || platformRaw === "IOS" ? platformRaw : undefined;
  const subscribed = params.get("silentWakeupSubscribed") === "true" ? true : params.get("silentWakeupSubscribed") === "false" ? false : undefined;
  const fcmTokenId = optionalPositiveInteger(params.get("fcmTokenId"));
  const sort = useListSort({ fields: [{ value: "fcmTokenId", label: "토큰 ID" }, { value: "createdAt", label: "등록 시각" }, { value: "updatedAt", label: "최근 갱신" }], defaultField: "fcmTokenId", defaultDirection: "desc", navigation: { query: params.toString(), update } });
  const filters = Object.fromEntries(Object.entries({ platform, silentWakeupSubscribed: subscribed, fcmTokenId }).filter(([, value]) => value !== undefined));
  const { data, isLoading, error, isFetching, refetch } = useUserFcmTokens(userId, page, size, { ...filters, ...sort.requestParams });
  useEffect(() => { if (!readOnly) filterForm.setFieldsValue({ platform, silentWakeupSubscribed: subscribed, fcmTokenId }); }, [filterForm, platform, subscribed, fcmTokenId, readOnly]);
  const { mutateAsync: deactivate, isPending, variables: deactivatingTokenId } = useDeactivateFcmToken(userId);
  const { mutate: updateSilentWakeup, isPending: isUpdatingSilentWakeup, variables: updatingSubscription } =
    useUpdateFcmTokenSilentWakeupSubscription(userId);
  const { mutateAsync: sendSilentMessage, isPending: isSendingSilent, variables: sendingTokenId } = useSendFcmTokenSilentMessage();
  const [testSendTokenId, setTestSendTokenId] = useState<number | null>(null);

  // 마지막 행을 비활성화한 뒤 서버 총수가 줄면 표시와 다음 조회의 페이지를 함께 보정한다.
  useEffect(() => { if (data && !error && !isFetching) {
    const lastPage = Math.max(1, Math.ceil(data.totalElements / data.size));
    if (page > lastPage) update({ page: String(lastPage) }, true);
  } }, [data, error, isFetching, page, update]);
  function applyFilters(values: Record<string, string | number | boolean | undefined>) {
    update({ page: "1", ...Object.fromEntries(["platform", "silentWakeupSubscribed", "fcmTokenId"].map((key) => [key, values[key] == null || values[key] === "" ? undefined : String(values[key])])) });
  }
  function removeFilter(label: string) { const key = ({"FCM 토큰 ID": "fcmTokenId", "플랫폼": "platform", "Silent Push": "silentWakeupSubscribed"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); update({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue({ platform: undefined, silentWakeupSubscribed: undefined, fcmTokenId: undefined }); applyFilters({}); }

  function subscriptionAction(token: FcmToken): RowAction {
    return { key: "subscription", label: token.silentWakeupSubscribed ? "Silent Push 구독 해제" : "Silent Push 구독",
      onClick: () => updateSilentWakeup({ fcmTokenId: token.fcmTokenId, subscribed: !token.silentWakeupSubscribed }, {
        onSuccess: () => notification.success({ title: "Silent Push 구독 상태가 변경되었습니다." }),
        onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "구독 상태 변경 실패", description: problem?.detail }); },
      }),
    };
  }
  function renderActions(token: FcmToken) {
        const busy = isPending || isUpdatingSilentWakeup || isSendingSilent;
        const loading = (isPending && deactivatingTokenId === token.fcmTokenId)
          || (isUpdatingSilentWakeup && updatingSubscription?.fcmTokenId === token.fcmTokenId)
          || (isSendingSilent && sendingTokenId === token.fcmTokenId);
        return <RowActions subject={`토큰 #${token.fcmTokenId}`} disabled={busy} loading={loading}
          primary={<Button size="small" disabled={busy} onClick={() => setTestSendTokenId(token.fcmTokenId)}>테스트 발송</Button>}
          items={[
            ...(token.platform === "ANDROID" ? [subscriptionAction(token), {
              key: "silent", label: "Silent 테스트",
              confirm: { title: "이 토큰으로 silent 메시지를 발송하시겠습니까?", description: `Android 토큰 #${token.fcmTokenId}로 테스트 메시지를 보냅니다.` },
              onClick: () => sendSilentMessage(token.fcmTokenId, {
                onSuccess: (res) => notification.success({ title: "Silent 테스트 발송 완료", description: `messageId: ${res.messageId}` }),
                onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "Silent 테스트 발송 실패", description: problem?.detail }); },
              }),
            } satisfies RowAction] : []),
            { type: "divider" },
            {
              key: "deactivate", label: "비활성화", danger: true,
              confirm: { title: "토큰을 비활성화하시겠습니까?", description: `토큰 #${token.fcmTokenId}를 등록 목록과 발송 대상에서 제외합니다.`, okText: "비활성화" },
              onClick: () => deactivate(token.fcmTokenId, {
                onSuccess: () => notification.success({ title: `토큰 #${token.fcmTokenId}를 비활성화했습니다.` }),
                onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "비활성화 실패", description: problem?.detail }); },
              }),
            },
          ]}
        />;

  }

  const columns: TableColumnsType<FcmToken> = [
    { title: "기기", key: "device", width: 140, render: (_, token) => <EntityCell
      primary={token.platform === "ANDROID" ? "Android" : "iOS"} meta={`토큰 #${token.fcmTokenId}`} /> },
    { title: "등록 토큰", dataIndex: "value", width: 250, render: (value: string) => <EntityCell primary={value} meta="마스킹된 값" /> },
    { title: "상태·최근 활동", key: "state", width: 250, render: (_, token) => <EntityCell
      primary={<Tag color={token.platform === "ANDROID" && token.silentWakeupSubscribed ? "green" : "default"}>
        {token.platform !== "ANDROID" ? "Silent Push 대상 아님" : token.silentWakeupSubscribed ? "Silent Push 구독됨" : "Silent Push 미구독"}
      </Tag>}
      secondary={`최근 갱신 ${formatDateTime(token.updatedAt)}`} meta={`등록 ${formatDateTime(token.createdAt)}`} /> },
    {
      title: "작업", key: "action", width: 160, fixed: "right",
      render: (_, token) => renderActions(token),
    },
  ];

  const compactColumns: TableColumnsType<FcmToken> = [columns[0], columns[2], columns[3]];
  const wideColumns: TableColumnsType<FcmToken> = [columns[0], columns[1],
    { title: "Silent Push", key: "subscription", width: 180, render: (_, token) => token.platform !== "ANDROID" ? "대상 아님" : token.silentWakeupSubscribed ? "구독됨" : "미구독" },
    { title: "등록일", dataIndex: "createdAt", width: 190, render: formatDateTime },
    { title: "최근 갱신", dataIndex: "updatedAt", width: 190, render: formatDateTime },
    columns[3],
  ];

  if (readOnly) return <>
    <QueryErrorAlert error={error} title="기기 토큰 보관 상태를 확인하지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="탈퇴 시 기기 토큰은 삭제됩니다. 보관된 토큰을 조회하거나 메시지를 발송할 수 없습니다." />
  </>;

  return (
    <>
      <FilterSection>
      <Form form={filterForm} name={`user-${userId}-fcm-filters`} layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="platform" label="플랫폼" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "Android", value: "ANDROID" }, { label: "iOS", value: "IOS" }]} /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
        <FilterMore>
          <Form.Item name="fcmTokenId" label="FCM 토큰 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="silentWakeupSubscribed" label="Silent Push 구독" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "구독됨", value: true }, { label: "미구독", value: false }]} /></Form.Item>
        </FilterMore>
      </Form>
      </FilterSection>
      <FilterSummary filters={[...(fcmTokenId ? [{ label: "FCM 토큰 ID", value: fcmTokenId }] : []), ...(platform ? [{ label: "플랫폼", value: platform }] : []), ...(subscribed !== undefined ? [{ label: "Silent Push", value: subscribed ? "구독됨" : "미구독" }] : [])].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="FCM 토큰 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <PagedTable sortControl={sort.control}
        columns={wideColumns}
        compactColumns={compactColumns}
        columnSizing={{
          value: { min: 300, preferred: 460, grow: 1 },
          state: { min: 250, preferred: 420, grow: 1 },
        }}
        renderCompactDetails={(token) => <EntityCell primary={token.value} secondary={`등록 ${formatDateTime(token.createdAt)}`} meta="마스킹된 등록 기기 토큰" />}
        renderCard={(token) => <RecordCard ariaLabel={`토큰 #${token.fcmTokenId}`} title={token.platform === "ANDROID" ? "Android 기기" : "iOS 기기"}
          meta={`토큰 #${token.fcmTokenId}`} fields={[
            { label: "Silent Push", value: token.platform !== "ANDROID" ? "대상 아님" : token.silentWakeupSubscribed ? "구독됨" : "미구독" },
            { label: "최근 갱신", value: formatDateTime(token.updatedAt) },
          ]} actions={renderActions(token)} details={<EntityCell primary={token.value} secondary={`등록 ${formatDateTime(token.createdAt)}`} meta="마스킹된 등록 기기 토큰" />} /> }
        dataSource={data?.fcmTokens ?? []}
        loading={isLoading}
        ariaLabel="사용자 FCM 토큰 목록"
        emptyText="조건에 맞는 활성 FCM 토큰이 없습니다. 필터를 초기화해 주세요."
        rowKey={(r) => String(r.fcmTokenId)}
        page={data ? data.page + 1 : page}
        pageSize={data?.size ?? size}
        total={data?.totalElements ?? 0}
        onPageChange={(nextPage, nextSize) => update({ page: String(nextSize === size ? nextPage : 1), size: String(nextSize) })}
      />}
      <FcmTestSendModal
        open={testSendTokenId !== null}
        onClose={() => setTestSendTokenId(null)}
        fcmTokenId={testSendTokenId}
      />
    </>
  );
}
