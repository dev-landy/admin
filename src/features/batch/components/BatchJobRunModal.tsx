"use client";

import { Alert, App, DatePicker, Form, Modal, Select, Space } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { parseProblemDetail } from "@/lib/api/problem";
import { useRunBatchJob } from "../hooks";
import { getSeoulToday } from "../targetDate";

type FormValues = { jobName: string; targetDate: Dayjs };

export function BatchJobRunModal({
  open,
  jobNames,
  onClose,
}: {
  open: boolean;
  jobNames: string[];
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { notification } = App.useApp();
  const { mutate: run, isPending } = useRunBatchJob();
  const jobName = Form.useWatch("jobName", form);

  function handleSubmit(values: FormValues) {
    if (isPending) return;
    run(
      { jobName: values.jobName, targetDate: values.targetDate.format("YYYY-MM-DD") },
      {
        onSuccess: (result) => {
          if (result.newExecutionId === null) {
            notification.info({
              title: "새 실행을 만들지 않았습니다.",
              description: `${result.jobName} · ${result.targetDate} · 현재 상태: ${result.status ?? "확인 필요"}. 실행 이력에서 확인하세요.`,
            });
          } else {
            notification.success({
              title: "배치 실행을 요청했습니다.",
              description: `${result.jobName} · ${result.targetDate} · 실행 ID: ${result.newExecutionId} · 상태: ${result.status ?? "확인 필요"}`,
            });
          }
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({ title: problem?.title ?? "배치 실행 실패", description: problem?.detail });
        },
      },
    );
  }

  return (
    <Modal
      title="날짜 지정 배치 실행"
      open={open}
      okText="실행 요청"
      cancelText="취소"
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={isPending}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      mask={{ closable: !isPending }}
      keyboard={!isPending}
      destroyOnHidden
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%", marginBottom: 16 }}>
        <Alert
          type="warning"
          showIcon
          title="선택한 날짜의 작업을 실행합니다"
          description="실행 이력이 없으면 시작하고, 실패·중지된 실행은 재시작합니다. 알림 발송이 발생할 수 있습니다. 이미 실행 중이거나 완료된 날짜는 새로 실행하지 않습니다."
        />
        <Alert
          type="info"
          showIcon
          title="과거 날짜 실행은 데이터 보정용입니다"
          description="대상일이 지난 예약 푸시와 납부일 알림톡은 발송되지 않습니다. 지연된 실행의 강제 복구는 실행 이력의 재시도를 사용하세요."
        />
        {jobName === "dueAlimtalkJob" && (
          <Alert type="warning" showIcon title="납부일 알림톡은 당일 08:55(한국 시간) 전에만 발송됩니다." />
        )}
        {jobName === "silentWakeupJob" && (
          <Alert type="warning" showIcon title="Silent wakeup 재시작은 구독 기기에 푸시를 다시 발송할 수 있습니다." />
        )}
        {jobName === "dailyDispatchAuditJob" && (
          <Alert type="info" showIcon title="일일 발송 점검은 미해결 건을 보고하며, 발송하거나 종결하지 않습니다." />
        )}
      </Space>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ targetDate: dayjs(getSeoulToday()) }}
        preserve={false}
        disabled={isPending}
      >
        <Form.Item label="Job" name="jobName" rules={[{ required: true, message: "Job을 선택하세요." }]}>
          <Select showSearch placeholder="실행할 Job 선택" options={jobNames.map((name) => ({ label: name, value: name }))} />
        </Form.Item>
        <Form.Item
          label="대상 날짜 (한국 시간)"
          name="targetDate"
          rules={[
            { required: true, message: "대상 날짜를 선택하세요." },
            {
              validator: (_rule, value: Dayjs | null) =>
                !value || (value.isValid() && value.format("YYYY-MM-DD") <= getSeoulToday())
                  ? Promise.resolve()
                  : Promise.reject(new Error("미래 날짜는 실행할 수 없습니다.")),
            },
          ]}
        >
          <DatePicker format="YYYY-MM-DD" disabledDate={(date) => date.format("YYYY-MM-DD") > getSeoulToday()} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
