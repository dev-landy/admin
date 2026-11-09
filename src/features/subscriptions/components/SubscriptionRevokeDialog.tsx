"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Alert, Form, Input, Modal } from "antd";
import { parseProblemDetail } from "@/lib/api/problem";
import type { SubscriptionGrant } from "../types";

export function SubscriptionRevokeDialog({ userId, grant, disabled, submit, onClose }: {
  userId: number; grant: SubscriptionGrant; disabled: boolean;
  submit: (request: { grantId: number; reason: string }) => Promise<unknown>; onClose: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
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
      const values = await form.validateFields();
      if (!active.current) return;
      setError(undefined);
      await submit({ grantId: grant.grantId, reason: values.reason.trim() });
      if (mounted.current) onClose();
    } catch (failure) {
      if (!mounted.current || (failure && typeof failure === "object" && "errorFields" in failure)) return;
      setError(parseProblemDetail(failure)?.detail ?? "회수 결과를 확인하지 못했습니다. 다시 확인해 주세요.");
    } finally {
      lock.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return <Modal open title="Pro 지급 회수" onOk={() => { void handleSubmit(); }}
    onCancel={() => { if (!lock.current) onClose(); }} okText="선택한 지급 회수" cancelText="취소"
    confirmLoading={pending} okButtonProps={{ danger: true, disabled, "aria-label": "선택한 지급 회수" }} cancelButtonProps={{ disabled: pending }}
    closable={!pending} keyboard={!pending} mask={{ closable: false }}>
    <p>사용자 #{userId} · 지급 #{grant.grantId}</p>
    <p>선택한 지급 건만 회수합니다. 다른 지급이나 스토어 구독이 유효하면 Pro는 유지되며, 스토어 결제는 해지되지 않습니다.</p>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
    <Form name={`subscription-revoke-${userId}-${grant.grantId}`} form={form} layout="vertical" disabled={disabled || pending}>
      <Form.Item name="reason" label="회수 사유" rules={[{ required: true, whitespace: true, max: 500, message: "회수 사유를 1~500자로 입력해 주세요." }]}>
        <Input.TextArea rows={3} maxLength={500} showCount />
      </Form.Item>
    </Form>
  </Modal>;
}
