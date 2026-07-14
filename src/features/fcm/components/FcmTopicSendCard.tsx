"use client";

import { App, Button, Card, Form, Input, Popconfirm } from "antd";

import { env } from "@/config/env";
import { parseProblemDetail } from "@/lib/api/problem";
import { useSendToTopic } from "../hooks";

const isProd = env.appEnv === "prod";

type FormValues = { topic: string; title: string; body: string };

export function FcmTopicSendCard() {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendToTopic();
  const [form] = Form.useForm<FormValues>();

  function handleSend() {
    form.validateFields().then((values) => {
      send(
        {
          topic: values.topic.trim(),
          content: { title: values.title, body: values.body },
        },
        {
          onSuccess: (res) => {
            notification.success({
              message: "토픽 발송 완료",
              description: `messageId: ${res.messageId}`,
            });
            form.resetFields();
          },
          onError: (err) => {
            const p = parseProblemDetail(err);
            notification.error({ message: p?.title ?? "토픽 발송 실패", description: p?.detail });
          },
        },
      );
    });
  }

  return (
    <Card title="토픽 발송" size="small">
      <Form form={form} layout="vertical">
        <Form.Item
          label="토픽"
          name="topic"
          rules={[{ required: true, whitespace: true, message: "토픽을 입력하세요." }]}
        >
          <Input placeholder="silent-wakeup-dev" />
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
        <Popconfirm
          title={isProd ? "prod 환경입니다" : "토픽 발송"}
          description={
            isProd
              ? "prod 환경입니다 — 실유저 기기 전체에 전달됩니다. 정말 발송할까요?"
              : "토픽을 구독 중인 모든 기기에 전달됩니다. 발송할까요?"
          }
          okText="발송"
          cancelText="취소"
          okButtonProps={isProd ? { danger: true } : undefined}
          onConfirm={handleSend}
        >
          <Button type="primary" danger={isProd} loading={isPending}>
            발송
          </Button>
        </Popconfirm>
      </Form>
    </Card>
  );
}
