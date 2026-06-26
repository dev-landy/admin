"use client";

import { App, Form, Input, InputNumber, Modal, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useSendCustomNotification } from "../hooks";
import type { SendCustomNotificationResponse } from "../types";

const { Text } = Typography;

type Props = { open: boolean; onClose: () => void };

type FormValues = { userId: number; title: string; body: string };

export function SendNotificationModal({ open, onClose }: Props) {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendCustomNotification();
  const [form] = Form.useForm<FormValues>();

  function handleOk() {
    form.validateFields().then((values) => {
      send(values, {
        onSuccess: (res: SendCustomNotificationResponse) => {
          notification.success({
            message: "알림 발송 완료",
            description: (
              <Text>
                알림 ID {res.notificationId} — 전송 {res.sent} / 실패 {res.failed} / 건너뜀 {res.skipped}
              </Text>
            ),
          });
          form.resetFields();
          onClose();
        },
        onError: (err) => {
          const p = parseProblemDetail(err);
          notification.error({ message: p?.title ?? "발송 실패", description: p?.detail });
        },
      });
    });
  }

  function handleCancel() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title="커스텀 알림 발송"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="발송"
      cancelText="취소"
      confirmLoading={isPending}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="유저 ID"
          name="userId"
          rules={[{ required: true, message: "유저 ID를 입력하세요." }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} placeholder="12" />
        </Form.Item>
        <Form.Item
          label="제목"
          name="title"
          rules={[{ required: true, whitespace: true, message: "제목을 입력하세요." }]}
        >
          <Input placeholder="공지사항" />
        </Form.Item>
        <Form.Item
          label="내용"
          name="body"
          rules={[{ required: true, whitespace: true, message: "내용을 입력하세요." }]}
        >
          <Input.TextArea rows={4} placeholder="안녕하세요, 운영팀입니다." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
