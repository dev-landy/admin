"use client";

import { useEffect, useRef } from "react";
import { Alert, App, Form, Input, Modal } from "antd";

import { useSendToToken } from "@/features/fcm/hooks";
import { parseProblemDetail } from "@/lib/api/problem";

type Props = { open: boolean; onClose: () => void; fcmTokenId: number | null };

type FormValues = { title: string; body: string };

export function FcmTestSendModal({ open, onClose, fcmTokenId }: Props) {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendToToken();
  const [form] = Form.useForm<FormValues>();

  const generation = useRef(0);
  const sending = useRef(false);
  useEffect(() => {
    generation.current += 1;
    sending.current = false;
    if (open) form.resetFields();
    return () => { generation.current += 1; };
  }, [open, fcmTokenId, form]);

  function handleOk() {
    if (!open || fcmTokenId === null || isPending || sending.current) return;
    form.submit();
  }

  function handleFinish(values: FormValues) {
    if (!open || fcmTokenId === null || isPending || sending.current) return;
    sending.current = true;
    const requestGeneration = generation.current;
      send(
        { fcmTokenId, ...values },
        {
          onSuccess: (res) => {
            if (requestGeneration !== generation.current) return;
            notification.success({
              title: "테스트 발송 완료",
              description: `messageId: ${res.messageId}`,
            });
            form.resetFields();
            onClose();
          },
          onError: (err) => {
            if (requestGeneration !== generation.current) return;
            const p = parseProblemDetail(err);
            notification.error({ title: p?.title ?? "테스트 발송 실패", description: p?.detail });
          },
          onSettled: () => { if (requestGeneration === generation.current) sending.current = false; },
        },
      );
  }

  function handleCancel() {
    if (isPending || sending.current) return;
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title={`FCM 테스트 발송 (토큰 #${fcmTokenId ?? "-"})`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="발송"
      cancelText="취소"
      confirmLoading={isPending}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      keyboard={!isPending}
      mask={{ closable: !isPending }}
    >
      <Alert
        type="info"
        showIcon
        title="CUSTOM 인앱 알림으로 저장되며, outbox 없이 선택한 토큰에 직접 발송됩니다."
      />
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={handleFinish} disabled={isPending} scrollToFirstError={{ focus: true }}>
        <Form.Item
          label="제목"
          name="title"
          rules={[{ required: true, whitespace: true, message: "제목을 입력하세요." }]}
        >
          <Input placeholder="테스트 알림" />
        </Form.Item>
        <Form.Item
          label="내용"
          name="body"
          rules={[{ required: true, whitespace: true, message: "내용을 입력하세요." }]}
        >
          <Input.TextArea rows={4} placeholder="테스트 메시지입니다." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
