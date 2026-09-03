"use client";

import { App, Form, Input, Modal, Switch, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useUpdateBatchSchedule } from "../hooks";
import type { BatchSchedule, UpdateBatchScheduleRequest } from "../types";

const { Text } = Typography;

export function BatchScheduleEditModal({
  schedule,
  onClose,
}: {
  schedule: BatchSchedule | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<UpdateBatchScheduleRequest>();
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateBatchSchedule();

  function handleSubmit(values: UpdateBatchScheduleRequest) {
    if (!schedule) return;
    update(
      {
        key: schedule.key,
        body: {
          cronExpression: values.cronExpression.trim(),
          zoneId: values.zoneId.trim(),
          enabled: values.enabled,
        },
      },
      {
        onSuccess: () => {
          notification.success({ message: "실행 시간이 변경되었습니다." });
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({
            message: problem?.title ?? "실행 시간 변경 실패",
            description: problem?.detail,
          });
        },
      },
    );
  }

  return (
    <Modal
      title={schedule ? `${schedule.label} 실행 시간 수정` : "실행 시간 수정"}
      open={schedule !== null}
      okText="저장"
      cancelText="취소"
      confirmLoading={isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
        initialValues={{
          cronExpression: schedule?.cronExpression ?? "",
          zoneId: schedule?.zoneId ?? "",
          enabled: schedule?.enabled ?? false,
        }}
      >
        <Form.Item
          label="크론 식"
          name="cronExpression"
          extra={<Text type="secondary">Spring 크론 형식(초 분 시 일 월 요일)입니다. 예: 0 0 9 * * *</Text>}
          rules={[{ required: true, whitespace: true, message: "크론 식을 입력하세요." }]}
        >
          <Input maxLength={100} placeholder="0 0 9 * * *" />
        </Form.Item>
        <Form.Item
          label="타임존"
          name="zoneId"
          rules={[{ required: true, whitespace: true, message: "타임존을 입력하세요." }]}
        >
          <Input maxLength={64} placeholder="Asia/Seoul" />
        </Form.Item>
        <Form.Item label="활성화" name="enabled" valuePropName="checked">
          <Switch checkedChildren="활성" unCheckedChildren="비활성" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
