"use client";

import { Alert, Button, Descriptions, Modal } from "antd";

import { describeCron } from "../cron";
import type { BatchSchedule } from "../types";

type Props = {
  // 확인을 기다리는 대상. null이면 모달이 닫힌 상태다.
  schedule: BatchSchedule | null;
  // 스위치가 바꾸려는 값. 현재 값이 아니라 적용될 값이다.
  enabled: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BatchScheduleToggleModal({
  schedule,
  enabled,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const action = enabled ? "활성화" : "비활성화";
  const cronDescription = schedule ? describeCron(schedule.cronExpression) : "";

  return (
    <Modal
      title={`배치 ${action}`}
      open={schedule !== null}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          닫기
        </Button>,
        <Button key="confirm" type="primary" loading={loading} onClick={onConfirm}>
          {action}
        </Button>,
      ]}
      destroyOnHidden
    >
      {schedule && (
        <>
          <Alert
            type="warning"
            showIcon
            title={
              enabled
                ? `${schedule.label} 트리거가 다시 예약됩니다. 지금부터 ${cronDescription} 일정으로 실행됩니다.`
                : `${schedule.label} 트리거가 예약에서 빠집니다. 다시 활성화하기 전까지 ${cronDescription} 예정이던 실행이 돌지 않습니다.`
            }
            style={{ marginBottom: 16 }}
          />
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Job">{schedule.jobName}</Descriptions.Item>
            <Descriptions.Item label="작업">{schedule.label}</Descriptions.Item>
            <Descriptions.Item label="실행 시각">{cronDescription}</Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
}
