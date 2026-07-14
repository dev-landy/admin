"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Form, Input, Space, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useSubscribeTopic, useUnsubscribeTopic } from "../hooks";
import type { TopicManagementResponse } from "../types";

const { Text } = Typography;

type FormValues = { topic: string; tokens: string };

type ActionResult = { action: "구독" | "구독 해제"; response: TopicManagementResponse };

function parseTokens(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function FcmTopicSubscriptionCard() {
  const { notification } = App.useApp();
  const { mutate: subscribe, isPending: isSubscribing } = useSubscribeTopic();
  const { mutate: unsubscribe, isPending: isUnsubscribing } = useUnsubscribeTopic();
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<ActionResult | null>(null);

  function handleAction(action: "구독" | "구독 해제") {
    form.validateFields().then((values) => {
      const mutate = action === "구독" ? subscribe : unsubscribe;
      mutate(
        { topic: values.topic.trim(), tokens: parseTokens(values.tokens) },
        {
          onSuccess: (response) => setResult({ action, response }),
          onError: (err) => {
            const p = parseProblemDetail(err);
            notification.error({ message: p?.title ?? `토픽 ${action} 실패`, description: p?.detail });
          },
        },
      );
    });
  }

  return (
    <Card title="토픽 구독 관리" size="small">
      <Form form={form} layout="vertical">
        <Form.Item
          label="토픽"
          name="topic"
          rules={[{ required: true, whitespace: true, message: "토픽을 입력하세요." }]}
        >
          <Input placeholder="silent-wakeup-dev" />
        </Form.Item>
        <Form.Item
          label="토큰 목록 (줄 단위)"
          name="tokens"
          rules={[
            {
              required: true,
              message: "토큰을 한 줄에 하나씩 입력하세요.",
              validator: (_, value: string | undefined) =>
                value && parseTokens(value).length > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error("토큰을 한 줄에 하나씩 입력하세요.")),
            },
          ]}
        >
          <Input.TextArea rows={4} placeholder={"토큰1\n토큰2"} />
        </Form.Item>
        <Space>
          <Button type="primary" loading={isSubscribing} onClick={() => handleAction("구독")}>
            구독
          </Button>
          <Button danger loading={isUnsubscribing} onClick={() => handleAction("구독 해제")}>
            구독 해제
          </Button>
        </Space>
      </Form>
      {result && (
        <Alert
          style={{ marginTop: 16 }}
          type={result.response.failureCount === 0 ? "success" : "warning"}
          showIcon
          message={`${result.action} 결과 — 성공 ${result.response.successCount} / 실패 ${result.response.failureCount}`}
          description={
            result.response.errors.length > 0 ? (
              <Space direction="vertical" size={0}>
                {result.response.errors.map((e) => (
                  <Text key={e.index} type="danger">
                    #{e.index}: {e.reason}
                  </Text>
                ))}
              </Space>
            ) : undefined
          }
          closable
          onClose={() => setResult(null)}
        />
      )}
    </Card>
  );
}
