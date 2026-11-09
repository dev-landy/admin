"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Alert, Form, Input, Modal, Radio } from "antd";
import { isAxiosError } from "axios";
import { parseProblemDetail } from "@/lib/api/problem";
import { parseGrantExpiration } from "../format";
import type { GrantOperation } from "../types";

type Fields = { permanent: boolean; expiration?: string; reason: string };
type Props = {
  userId: number; email: string; open: boolean; disabled: boolean;
  submit: (operation: GrantOperation) => Promise<unknown>; onClose: () => void;
};

export function SubscriptionGrantDialog({ userId, email, open, disabled, submit, onClose }: Props) {
  const [form] = Form.useForm<Fields>();
  const permanent = Form.useWatch("permanent", form);
  const [operation, setOperation] = useState<GrantOperation | null>(null);
  const operationRef = useRef<GrantOperation | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const active = useRef(!disabled);
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useLayoutEffect(() => {
    active.current = !disabled;
    return () => { active.current = false; };
  }, [disabled, userId]);

  async function handleSubmit() {
    if (lock.current || !active.current) return;
    lock.current = true;
    setPending(true);
    try {
      let request = operationRef.current;
      if (!request) {
        const values = await form.validateFields();
        if (!active.current) return;
        const expiresAt = values.permanent ? null : parseGrantExpiration(values.expiration ?? "");
        if (!values.permanent && !expiresAt) {
          form.setFields([{ name: "expiration", errors: ["현재보다 늦은 종료 시각을 입력해 주세요."] }]);
          return;
        }
        request = { requestKey: crypto.randomUUID(), request: {
          permanent: values.permanent, expiresAt, reason: values.reason.trim(),
        } };
        operationRef.current = request;
        setOperation(request);
      }
      setError(undefined);
      await submit(request);
      if (!mounted.current) return;
      operationRef.current = null;
      setOperation(null);
      form.resetFields();
      onClose();
    } catch (failure) {
      if (!mounted.current || (failure && typeof failure === "object" && "errorFields" in failure)) return;
      const problem = parseProblemDetail(failure);
      // A validation rejection cannot have created the grant. Allow the operator to correct it.
      // Ambiguous network/server failures keep the original key and immutable payload.
      if (isAxiosError(failure) && failure.response?.status === 400) {
        operationRef.current = null;
        setOperation(null);
      }
      setError(problem?.detail ?? "지급 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.");
    } finally {
      lock.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <Modal title="Pro 혜택 지급" open={open} onCancel={() => { if (!lock.current) onClose(); }}
    onOk={() => { void handleSubmit(); }} okText={operation ? "같은 요청 다시 확인" : "Pro 지급"} cancelText="닫기"
    confirmLoading={pending} okButtonProps={{ disabled, "aria-label": operation ? "같은 요청 다시 확인" : "Pro 지급" }}
    cancelButtonProps={{ disabled: pending }} closable={!pending} keyboard={!pending} mask={{ closable: false }}>
    <p>사용자 #{userId} · {email}</p>
    <p>스토어 결제 없이 Pro를 지급합니다. 기존 스토어 구독의 자동 갱신은 바뀌지 않습니다.</p>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
    {operation && <Alert type="info" showIcon title="최초 지급 요청의 내용으로 재확인합니다."
      description="결과 확인 전에는 기간과 사유를 변경하지 않습니다. 창을 닫았다 열어도 같은 요청을 사용합니다."
      style={{ marginBottom: 16 }} />}
    <Form name={`subscription-grant-${userId}`} form={form} layout="vertical" initialValues={{ permanent: false }} disabled={disabled || pending || Boolean(operation)}>
      <Form.Item name="permanent" label="이용 기간">
        <Radio.Group options={[{ label: "기간 지정", value: false }, { label: "영구", value: true }]} />
      </Form.Item>
      {!permanent && <Form.Item name="expiration" label="종료 시각 (한국 시간)" rules={[{
        validator: (_, value: string) => parseGrantExpiration(value ?? "") ? Promise.resolve() : Promise.reject(new Error("현재보다 늦은 종료 시각을 입력해 주세요.")),
      }]}>
        <Input type="datetime-local" />
      </Form.Item>}
      <Form.Item name="reason" label="지급 사유" rules={[{ required: true, whitespace: true, max: 500, message: "지급 사유를 1~500자로 입력해 주세요." }]}>
        <Input.TextArea rows={3} maxLength={500} showCount />
      </Form.Item>
    </Form>
  </Modal>;
}
