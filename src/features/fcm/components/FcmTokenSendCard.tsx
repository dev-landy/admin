"use client";

import { App, Button, Card, Form, Input, InputNumber } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useSendToToken } from "../hooks";

type FormValues = { fcmTokenId: number; title: string; body: string };

export function FcmTokenSendCard() {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendToToken();
  const [form] = Form.useForm<FormValues>();

  function handleSend() {
    form.validateFields().then((values) => {
      send(
        {
          fcmTokenId: values.fcmTokenId,
          title: values.title,
          body: values.body,
        },
        {
          onSuccess: (res) => {
            notification.success({
              message: "등록 토큰 테스트 발송 완료",
              description: `messageId: ${res.messageId}`,
            });
            form.resetFields();
          },
          onError: (err) => {
            const p = parseProblemDetail(err);
            notification.error({ message: p?.title ?? "등록 토큰 테스트 발송 실패", description: p?.detail });
          },
        },
      );
    });
  }

  return (
    <Card title="등록 토큰 ID 발송" size="small">
      <Form form={form} layout="vertical">
        <Form.Item
          label="FCM 토큰 ID"
          name="fcmTokenId"
          rules={[{ required: true, message: "FCM 토큰 ID를 입력하세요." }]}
        >
          <InputNumber min={1} precision={0} style={{ width: "100%" }} placeholder="123" />
        </Form.Item>
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
          <Input.TextArea rows={3} placeholder="테스트 메시지입니다." />
        </Form.Item>
        <Button type="primary" onClick={handleSend} loading={isPending}>
          발송
        </Button>
      </Form>
    </Card>
  );
}
