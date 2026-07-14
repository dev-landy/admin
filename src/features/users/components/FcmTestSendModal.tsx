"use client";

import { Alert, App, Form, Input, Modal } from "antd";

import { useSendToToken } from "@/features/fcm/hooks";
import { parseProblemDetail } from "@/lib/api/problem";

type Props = { open: boolean; onClose: () => void; fcmTokenId: number | null };

type FormValues = { title: string; body: string };

export function FcmTestSendModal({ open, onClose, fcmTokenId }: Props) {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendToToken();
  const [form] = Form.useForm<FormValues>();

  function handleOk() {
    if (fcmTokenId === null) return;
    form.validateFields().then((values) => {
      send(
        { fcmTokenId, ...values },
        {
          onSuccess: (res) => {
            notification.success({
              message: "테스트 발송 완료",
              description: `messageId: ${res.messageId}`,
            });
            form.resetFields();
            onClose();
          },
          onError: (err) => {
            const p = parseProblemDetail(err);
            notification.error({ message: p?.title ?? "테스트 발송 실패", description: p?.detail });
          },
        },
      );
    });
  }

  function handleCancel() {
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
    >
      <Alert
        type="info"
        showIcon
        title="CUSTOM 인앱 알림으로 저장되며, outbox 없이 선택한 토큰에 직접 발송됩니다."
      />
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
