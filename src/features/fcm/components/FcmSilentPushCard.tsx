"use client";

import { App, Button, Card, Divider, Form, Input, Popconfirm, Space, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";

import { env } from "@/config/env";
import { FormFieldGrid } from "@/components/FormFieldGrid";
import { parseProblemDetail } from "@/lib/api/problem";
import { useSendSilentPushToTopic, useSendSilentWakeup } from "../hooks";

const { Text } = Typography;

const isProd = env.appEnv === "prod";

type DataEntry = { key: string; value: string };
type FormValues = { topic: string; entries: DataEntry[] };

export function FcmSilentPushCard() {
  const { notification } = App.useApp();
  const { mutate: sendWakeup, isPending: isWakeupPending } = useSendSilentWakeup();
  const { mutate: sendSilentPush, isPending: isSilentPushPending } = useSendSilentPushToTopic();
  const [form] = Form.useForm<FormValues>();

  const isPending = isWakeupPending || isSilentPushPending;

  function handleWakeup() {
    if (isPending) return;
    sendWakeup(undefined, {
      onSuccess: (res) => {
        notification.success({
          title: "silent-wakeup 발송 완료",
          description: `messageId: ${res.messageId}`,
        });
      },
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "silent-wakeup 발송 실패", description: p?.detail });
      },
    });
  }

  function handleSilentPush() {
    if (isPending) return;
    form.validateFields().then((values) => {
      const data = Object.fromEntries(values.entries.map((e) => [e.key.trim(), e.value]));
      sendSilentPush(
        { topic: values.topic.trim(), data },
        {
          onSuccess: (res) => {
            notification.success({
              title: "silent push 발송 완료",
              description: `messageId: ${res.messageId}`,
            });
            form.resetFields();
          },
          onError: (err) => {
            const p = parseProblemDetail(err);
            notification.error({ title: p?.title ?? "silent push 발송 실패", description: p?.detail });
          },
        },
      );
    }).catch(() => undefined);
  }

  return (
    <Card title="Silent Push" size="small">
      <Space orientation="vertical" size={4} style={{ width: "100%" }}>
        <Text strong>운영 silent-wakeup 발송</Text>
        <Text type="secondary">스케줄러와 동일한 경로로 silent-wakeup 토픽에 발송합니다.</Text>
        <Popconfirm
          title={isProd ? "prod 환경입니다" : "silent-wakeup 발송"}
          description={
            isProd
              ? "prod 환경입니다 — 스케줄러와 동일한 경로로 실유저 구독 기기 전체를 깨웁니다. 정말 발송할까요?"
              : "스케줄러와 동일한 경로로 구독 기기 전체를 깨웁니다. 발송할까요?"
          }
          okText="발송"
          cancelText="취소"
          okButtonProps={isProd ? { danger: true } : undefined}
          disabled={isPending}
          onConfirm={handleWakeup}
        >
          <Button danger={isProd} loading={isWakeupPending} disabled={isPending}>
            silent-wakeup 발송
          </Button>
        </Popconfirm>
      </Space>
      <Divider />
      <Text strong>임의 토픽 silent push</Text>
      <Form name="fcm-silent-push" form={form} layout="vertical" disabled={isPending} style={{ marginTop: 8 }} initialValues={{ entries: [{ key: "", value: "" }] }}>
        <Form.Item
          label="토픽"
          name="topic"
          rules={[{ required: true, whitespace: true, message: "토픽을 입력하세요." }]}
        >
          <Input placeholder="silent-wakeup-dev" />
        </Form.Item>
        <Form.List
          name="entries"
          rules={[
            {
              validator: (_, entries: DataEntry[] | undefined) => {
                if (!entries?.length) return Promise.reject(new Error("data 항목을 최소 1쌍 입력하세요."));
                const keys = entries.map((entry) => entry?.key?.trim()).filter(Boolean);
                return new Set(keys).size === keys.length
                  ? Promise.resolve()
                  : Promise.reject(new Error("data key는 중복 없이 입력하세요."));
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <FormFieldGrid actions={fields.length > 1 ? (
                    <Button aria-label={`data 항목 ${name + 1} 삭제`} icon={<MinusCircleOutlined />} disabled={isPending} onClick={() => remove(name)} />
                  ) : undefined}>
                    <Form.Item
                      {...restField}
                      label="data key"
                      name={[name, "key"]}
                      rules={[{ required: true, whitespace: true, message: "key를 입력하세요." }]}
                    >
                      <Input aria-label={`data 항목 ${name + 1} key`} placeholder="key" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      label="data value"
                      name={[name, "value"]}
                      rules={[{ required: true, message: "value를 입력하세요." }]}
                    >
                      <Input aria-label={`data 항목 ${name + 1} value`} placeholder="value" />
                    </Form.Item>
                  </FormFieldGrid>
                </div>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ key: "", value: "" })} icon={<PlusOutlined />} block>
                  data 항목 추가
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
        <Popconfirm
          title={isProd ? "prod 환경입니다" : "silent push 발송"}
          description={
            isProd
              ? "prod 환경입니다 — 토픽을 구독 중인 실유저 기기 전체에 전달됩니다. 정말 발송할까요?"
              : "토픽을 구독 중인 모든 기기에 전달됩니다. 발송할까요?"
          }
          okText="발송"
          cancelText="취소"
          okButtonProps={isProd ? { danger: true } : undefined}
          disabled={isPending}
          onConfirm={handleSilentPush}
        >
          <Button type="primary" danger={isProd} loading={isSilentPushPending} disabled={isPending}>
            silent push 발송
          </Button>
        </Popconfirm>
      </Form>
    </Card>
  );
}
