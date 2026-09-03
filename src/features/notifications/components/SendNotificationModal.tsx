"use client";

import { App, Form, Input, InputNumber, Modal, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useSendCustomNotification } from "../hooks";
import type { SendCustomNotificationResponse } from "../types";

const { Text } = Typography;

type Props = { open: boolean; onClose: () => void };

type FormValues = { userId: number; title: string; body: string };

type SendFeedback = {
  level: "success" | "warning";
  title: string;
  description: React.ReactNode;
  // 자동 발송기가 가져간 경우는 읽기 전에 사라지면 안 된다. 0이면 자동으로 닫히지 않는다.
  duration?: number;
};

function formatCounts(result: SendCustomNotificationResponse): string {
  return `전송 ${result.sent} / 실패 ${result.failed} / 건너뜀 ${result.skipped}`;
}

// 0/0/0은 그 자체로는 "보낼 대상이 없었다"와 "자동 발송기가 이미 가져갔다"를 구분하지 못한다.
// 뒤쪽을 앞쪽으로 오해하면 재발송으로 인앱 알림과 푸시가 모두 중복되므로 문구를 따로 만든다.
function toFeedback(result: SendCustomNotificationResponse): SendFeedback {
  if (result.alreadyClaimed > 0) {
    return {
      level: "warning",
      title: "이미 자동 발송 중입니다 — 다시 발송하지 마세요",
      description: (
        <>
          <div>알림 ID {result.notificationId}</div>
          <div>
            1분 주기 자동 발송기가 {result.alreadyClaimed}건을 먼저 가져갔습니다. 이 건들은 자동
            발송기가 그대로 전송하므로 누락이 아닙니다.
          </div>
          <div>같은 알림을 다시 발송하면 인앱 알림과 푸시가 중복됩니다.</div>
          <div>이번 요청이 처리한 건: {formatCounts(result)}</div>
        </>
      ),
      duration: 0,
    };
  }

  if (result.sent === 0 && result.failed === 0 && result.skipped === 0) {
    return {
      level: "warning",
      title: "발송 대상이 없습니다",
      description: (
        <>
          <div>알림 ID {result.notificationId}</div>
          <div>활성 FCM 토큰이 없어 발송할 대상이 없습니다. 전송된 푸시가 없습니다.</div>
        </>
      ),
    };
  }

  return {
    level: "success",
    title: "알림 발송 완료",
    description: (
      <Text>
        알림 ID {result.notificationId} — {formatCounts(result)}
      </Text>
    ),
  };
}

export function SendNotificationModal({ open, onClose }: Props) {
  const { notification } = App.useApp();
  const { mutate: send, isPending } = useSendCustomNotification();
  const [form] = Form.useForm<FormValues>();

  function handleOk() {
    form.validateFields().then((values) => {
      send(values, {
        onSuccess: (res: SendCustomNotificationResponse) => {
          const { level, ...args } = toFeedback(res);
          notification[level](args);
          form.resetFields();
          onClose();
        },
        onError: (err) => {
          const p = parseProblemDetail(err);
          notification.error({ title: p?.title ?? "발송 실패", description: p?.detail });
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
