"use client";

import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Pagination, Select, Space, Tag, Typography } from "antd";

import { UserLookupSelect } from "@/components/EntityLookupSelect";
import { EntityCell } from "@/components/EntityCell";
import { FilterMore } from "@/components/FilterMore";
import { FilterActions } from "@/components/FilterActions";
import { fetchUserFcmTokens } from "@/features/users/api";
import { userKeys } from "@/features/users/hooks";
import type { FcmToken } from "@/features/users/types";
import { formatDateTime } from "@/lib/format/date";
import { optionalPositiveInteger } from "@/lib/navigation/listParams";
import { parseProblemDetail } from "@/lib/api/problem";
import { useSendToToken } from "../hooks";
import styles from "./FcmTokenSendCard.module.css";

type FormValues = { title: string; body: string };
type Selection = { source: string; userId?: number; tokenId?: number; exactId?: number; page: number };
type Confirmation = { userId: number; token: FcmToken; values: FormValues };
const PAGE_SIZE = 20;

export function FcmTokenSendCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = `${searchParams.get("userId") ?? ""}/${searchParams.get("fcmTokenId") ?? ""}`;
  const readSelection = (): Selection => ({
    source, userId: optionalPositiveInteger(searchParams.get("userId")),
    tokenId: optionalPositiveInteger(searchParams.get("fcmTokenId")),
    exactId: optionalPositiveInteger(searchParams.get("fcmTokenId")), page: 1,
  });
  const [selection, setSelection] = useState(readSelection);
  // Browser history changes the target without discarding the independent message draft.
  if (selection.source !== source) {
    const restored = readSelection();
    setSelection(restored.userId === selection.userId && restored.tokenId === selection.tokenId
      ? { ...selection, source } : restored);
  }
  const { notification } = App.useApp();
  const { mutateAsync: send, isPending } = useSendToToken();
  const [form] = Form.useForm<FormValues>();
  const [idForm] = Form.useForm<{ fcmTokenId: number }>();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  if (confirmation && (confirmation.userId !== selection.userId || confirmation.token.fcmTokenId !== selection.tokenId)) setConfirmation(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const locked = isPending || sending;
  const tokenFilters = { fcmTokenId: selection.exactId };
  const tokens = useQuery({
    queryKey: userKeys.fcmTokenPage(selection.userId ?? 0, selection.page, PAGE_SIZE, tokenFilters),
    queryFn: () => fetchUserFcmTokens(selection.userId!, { ...tokenFilters, page: selection.page, size: PAGE_SIZE }),
    enabled: selection.userId !== undefined,
  });
  const registered = (tokens.data?.fcmTokens ?? []).filter((token) => token.userId === selection.userId);
  const target = registered.find((token) => token.fcmTokenId === selection.tokenId);
  const verified = target !== undefined && !tokens.isFetching && !tokens.isError;
  useEffect(() => {
    generation.current += 1;
    return () => { generation.current += 1; };
  }, [selection.userId, selection.tokenId]);

  function writeTarget(userId?: number, tokenId?: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (userId === undefined) params.delete("userId"); else params.set("userId", String(userId));
    if (tokenId === undefined) params.delete("fcmTokenId"); else params.set("fcmTokenId", String(tokenId));
    router.replace(`/fcm${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  function selectUser(userId?: number) {
    if (locked) return;
    setSelection({ source: selection.source, userId, page: 1 });
    idForm.resetFields();
    writeTarget(userId);
  }
  function selectToken(tokenId?: number) {
    if (locked) return;
    setSelection({ ...selection, tokenId });
    writeTarget(selection.userId, tokenId);
  }
  function findToken({ fcmTokenId }: { fcmTokenId: number }) {
    if (locked || selection.userId === undefined) return;
    setSelection({ ...selection, tokenId: fcmTokenId, exactId: fcmTokenId, page: 1 });
    writeTarget(selection.userId, fcmTokenId);
  }
  function showAllTokens() {
    if (locked) return;
    setSelection({ ...selection, tokenId: undefined, exactId: undefined, page: 1 });
    idForm.resetFields();
    writeTarget(selection.userId);
  }
  function prepareSend(values: FormValues) {
    if (locked || busy.current || !verified || selection.userId === undefined) return;
    setConfirmation({ userId: selection.userId, token: target, values });
  }
  async function confirmSend() {
    if (locked || busy.current || !confirmation || !verified || confirmation.token.fcmTokenId !== target.fcmTokenId || confirmation.userId !== selection.userId) return;
    busy.current = true;
    setSending(true);
    const requestGeneration = generation.current;
    try {
      const result = await send({ fcmTokenId: confirmation.token.fcmTokenId, ...confirmation.values });
      if (requestGeneration !== generation.current) return;
      notification.success({ title: "등록 토큰 테스트 발송 완료", description: `messageId: ${result.messageId}` });
      form.resetFields();
      setConfirmation(null);
    } catch (error) {
      if (requestGeneration !== generation.current) return;
      const problem = parseProblemDetail(error);
      notification.error({ title: problem?.title ?? "등록 토큰 테스트 발송 실패", description: problem?.detail });
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return <Card title="등록 기기 테스트 발송" size="small">
    <div className={styles.workspace}>
      <section aria-label="발송 대상 선택">
        <Typography.Title level={2} style={{ fontSize: 16, marginTop: 0 }}>1. 유저와 등록 기기 선택</Typography.Title>
        <Form layout="vertical" name="fcm-target">
          <Form.Item label="유저" className="admin-entity-lookup"><UserLookupSelect aria-label="유저" value={selection.userId} onChange={selectUser} disabled={locked} /></Form.Item>
          <Form.Item label="등록 기기" className="admin-entity-lookup"><Select<number> aria-label="등록 기기" value={selection.tokenId} onChange={selectToken} allowClear virtual={false}
            disabled={locked || selection.userId === undefined || tokens.isError} loading={tokens.isFetching}
            placeholder={selection.userId === undefined ? "먼저 유저를 선택하세요" : "등록 기기를 선택하세요"}
            style={{ width: "100%" }} options={registered.map((token) => ({ value: token.fcmTokenId,
              label: `${token.platform === "ANDROID" ? "Android" : "iOS"} · 토큰 #${token.fcmTokenId} · 최근 ${formatDateTime(token.updatedAt)}` }))} />
          </Form.Item>
        </Form>
        {selection.exactId !== undefined && <div className={styles.scope}>
          <span>토큰 #{selection.exactId}만 조회 중</span>
          <Button onClick={showAllTokens} disabled={locked}>전체 등록 기기 보기</Button>
        </div>}
        {tokens.isError && <Alert type="error" showIcon title="등록 기기를 불러오지 못했습니다." action={<Button onClick={() => void tokens.refetch()} disabled={locked}>다시 조회</Button>} />}
        {selection.userId !== undefined && tokens.isSuccess && !tokens.isFetching && registered.length === 0 && <Alert type="info" showIcon title={selection.exactId === undefined ? "이 유저의 활성 등록 기기가 없습니다." : "선택한 유저에게 등록된 토큰 ID가 아닙니다."} />}
        {selection.exactId === undefined && (tokens.data?.totalElements ?? 0) > PAGE_SIZE && <Pagination className={styles.devicePagination} current={selection.page} pageSize={PAGE_SIZE} total={tokens.data!.totalElements}
          size="small" showSizeChanger={false} disabled={locked}
          locale={{ prev_page: "등록 기기 이전 페이지", next_page: "등록 기기 다음 페이지" }}
          itemRender={(_page, type, node) => (type === "prev" || type === "next") && isValidElement<{ "aria-label"?: string }>(node)
            ? cloneElement(node, { "aria-label": type === "prev" ? "등록 기기 이전 페이지" : "등록 기기 다음 페이지" }) : node} onChange={(page) => { setSelection({ ...selection, page, tokenId: undefined }); writeTarget(selection.userId); }} />}
        <Form form={idForm} name="fcm-token-id-lookup" layout="vertical" onFinish={findToken} disabled={locked || selection.userId === undefined}>
          <FilterMore label="토큰 ID 직접 조회">
            <Form.Item name="fcmTokenId" label="FCM 토큰 ID" rules={[{ required: true, message: "토큰 ID를 입력하세요." }, { type: "integer", min: 1, message: "1 이상의 정수 ID를 입력하세요." }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
            <FilterActions><Space wrap><Button htmlType="submit">이 유저의 토큰 확인</Button><Button onClick={showAllTokens}>전체 등록 기기</Button></Space></FilterActions>
          </FilterMore>
        </Form>
        {target && <div className={styles.target} aria-label="선택한 발송 대상"><EntityCell primary={`${target.platform === "ANDROID" ? "Android" : "iOS"} · 토큰 #${target.fcmTokenId}`}
          secondary={`유저 #${target.userId}`} meta={`등록 ${formatDateTime(target.createdAt)} · 최근 수정 ${formatDateTime(target.updatedAt)}`}>
          <Tag>{target.silentWakeupSubscribed ? "백그라운드 푸시 구독" : "백그라운드 푸시 미구독"}</Tag>
          <div className={styles.token}>기기 토큰 {target.value}</div>
        </EntityCell></div>}
      </section>
      <section aria-label="테스트 메시지 작성">
        <Typography.Title level={2} style={{ fontSize: 16, marginTop: 0 }}>2. 메시지 작성·확인</Typography.Title>
        <Alert type="info" showIcon title="선택한 기기에 테스트 알림을 직접 발송합니다." description="CUSTOM 알림으로 저장되며 Outbox는 생성하지 않습니다." style={{ marginBottom: 16 }} />
        <Form name="fcm-token-send" form={form} layout="vertical" onFinish={prepareSend} disabled={locked} scrollToFirstError={{ focus: true }}>
          <Form.Item label="제목" name="title" rules={[{ required: true, whitespace: true, message: "제목을 입력하세요." }]}><Input placeholder="테스트 알림" /></Form.Item>
          <Form.Item label="내용" name="body" rules={[{ required: true, whitespace: true, message: "내용을 입력하세요." }]}><Input.TextArea rows={3} placeholder="테스트 메시지입니다." /></Form.Item>
          <Button type="primary" htmlType="submit" loading={locked} disabled={locked || !verified}>발송 내용 확인</Button>
          {!verified && <div className="admin-detail-meta">등록 기기를 확인·선택하면 발송할 수 있습니다.</div>}
        </Form>
      </section>
    </div>
    <Modal title="선택한 등록 기기로 발송할까요?" open={confirmation !== null} onOk={() => void confirmSend()} onCancel={() => { if (!locked && !busy.current) setConfirmation(null); }}
      okText="발송" cancelText="취소" confirmLoading={locked} cancelButtonProps={{ disabled: locked, autoFocus: true }} okButtonProps={{ disabled: locked || !verified, "aria-label": "발송" }}
      closable={!locked} keyboard={!locked} mask={{ closable: !locked }}>
      {confirmation && <><Typography.Paragraph>유저 #{confirmation.userId} · {confirmation.token.platform === "ANDROID" ? "Android" : "iOS"} · 토큰 #{confirmation.token.fcmTokenId}</Typography.Paragraph>
        <Typography.Paragraph strong>{confirmation.values.title}</Typography.Paragraph><Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>{confirmation.values.body}</Typography.Paragraph></>}
    </Modal>
  </Card>;
}
