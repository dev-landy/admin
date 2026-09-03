"use client";

import { App, Form, Input, InputNumber, Modal, Radio, Space, Typography } from "antd";
import type { FormRule } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { buildCron, describeCron, parseCron } from "../cron";
import type { CronMode } from "../cron";
import { useUpdateBatchSchedule } from "../hooks";
import type { BatchSchedule, UpdateBatchScheduleRequest } from "../types";

const { Text } = Typography;

const MAX_HOUR = 23;
const MAX_MINUTE = 59;

// 활성 여부는 목록의 스위치에서 바꾼다. 이 모달은 실행 시간만 다룬다.
// 아는 세 모양은 구조화된 입력으로 받고, 그 밖의 식은 직접 입력으로 남겨둔다.
type ScheduleMode = CronMode | "manual";

type ScheduleFormValues = {
  mode: ScheduleMode;
  hour: number | null;
  minute: number | null;
  startMinute: number | null;
  intervalMinutes: number | null;
  startHour: number | null;
  endHour: number | null;
  cronExpression: string;
};

const MODE_OPTIONS: { label: string; value: ScheduleMode }[] = [
  { label: "매일 한 번", value: "daily" },
  { label: "시간대 내 반복", value: "interval" },
  { label: "매시 정각 범위", value: "hourlyRange" },
  { label: "크론식 직접 입력", value: "manual" },
];

const DEFAULT_VALUES: ScheduleFormValues = {
  mode: "manual",
  hour: 9,
  minute: 0,
  startMinute: 0,
  intervalMinutes: 10,
  startHour: 9,
  endHour: 23,
  cronExpression: "",
};

function toFormValues(schedule: BatchSchedule | null): ScheduleFormValues {
  if (!schedule) {
    return DEFAULT_VALUES;
  }

  const base: ScheduleFormValues = { ...DEFAULT_VALUES, cronExpression: schedule.cronExpression };
  const parsed = parseCron(schedule.cronExpression);
  // 해석하지 못한 식은 직접 입력으로 열어 원문을 그대로 고치게 한다.
  if (!parsed) {
    return base;
  }

  switch (parsed.mode) {
    case "daily":
      return { ...base, mode: "daily", hour: parsed.hour, minute: parsed.minute };
    case "interval":
      return {
        ...base,
        mode: "interval",
        hour: parsed.hour,
        startMinute: parsed.startMinute,
        intervalMinutes: parsed.intervalMinutes,
      };
    case "hourlyRange":
      return {
        ...base,
        mode: "hourlyRange",
        startHour: parsed.startHour,
        endHour: parsed.endHour,
        minute: parsed.minute,
      };
  }
}

// 라벨에 범위를 적어두고 같은 범위를 규칙으로도 막는다. InputNumber의 min·max는 blur 시점에
// 값을 다듬을 뿐이라, 저장 직전에 한 번 더 확인해야 범위를 벗어난 값이 서버로 가지 않는다.
function rangeRules(requiredMessage: string, min: number, max: number): FormRule[] {
  return [
    { required: true, message: requiredMessage },
    { type: "number", min, max, message: `${min}~${max} 사이 값을 입력하세요.` },
  ];
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// 저장 직전 값과 미리보기가 같은 함수를 쓴다. 화면에 보이는 식이 그대로 전송된다.
function toCronExpression(values: Partial<ScheduleFormValues>): string | null {
  switch (values.mode) {
    case "daily":
      return isNumber(values.hour) && isNumber(values.minute)
        ? buildCron({ mode: "daily", hour: values.hour, minute: values.minute })
        : null;
    case "interval":
      return isNumber(values.hour) &&
        isNumber(values.startMinute) &&
        isNumber(values.intervalMinutes)
        ? buildCron({
            mode: "interval",
            hour: values.hour,
            startMinute: values.startMinute,
            intervalMinutes: values.intervalMinutes,
          })
        : null;
    case "hourlyRange":
      return isNumber(values.startHour) && isNumber(values.endHour) && isNumber(values.minute)
        ? buildCron({
            mode: "hourlyRange",
            startHour: values.startHour,
            endHour: values.endHour,
            minute: values.minute,
          })
        : null;
    default:
      return values.cronExpression?.trim() || null;
  }
}

export function BatchScheduleEditModal({
  schedule,
  onClose,
}: {
  schedule: BatchSchedule | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<ScheduleFormValues>();
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateBatchSchedule();

  const initialValues = toFormValues(schedule);
  // 모달은 destroyOnHidden이라 열 때마다 폼이 새로 마운트된다. 첫 렌더에는 watch 값이 없어
  // 초기값으로 채운다.
  const watched: Partial<ScheduleFormValues> | undefined = Form.useWatch([], form);
  const values = { ...initialValues, ...watched };
  const preview = toCronExpression(values);

  function handleSubmit(submitted: ScheduleFormValues) {
    if (!schedule) return;
    const cronExpression = toCronExpression(submitted);
    if (!cronExpression) return;

    update(
      {
        key: schedule.key,
        body: {
          cronExpression,
          // 활성 여부는 목록의 스위치가 다룬다. 현재 값을 그대로 보내 실행 시간 수정이
          // 활성 여부를 조용히 뒤집지 않게 한다.
          enabled: schedule.enabled,
        } satisfies UpdateBatchScheduleRequest,
      },
      {
        onSuccess: () => {
          notification.success({ title: "실행 시간이 변경되었습니다." });
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({
            title: problem?.title ?? "배치 수정 실패",
            description: problem?.detail,
          });
        },
      },
    );
  }

  return (
    <Modal
      title="배치 수정"
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
        initialValues={initialValues}
      >
        <Form.Item label="실행 방식" name="mode">
          <Radio.Group options={MODE_OPTIONS} />
        </Form.Item>

        {values.mode === "daily" && (
          <Space size="middle" align="start">
            <Form.Item
              label={`시 (0~${MAX_HOUR})`}
              name="hour"
              rules={rangeRules("시를 입력하세요.", 0, MAX_HOUR)}
            >
              <InputNumber min={0} max={MAX_HOUR} />
            </Form.Item>
            <Form.Item
              label={`분 (0~${MAX_MINUTE})`}
              name="minute"
              rules={rangeRules("분을 입력하세요.", 0, MAX_MINUTE)}
            >
              <InputNumber min={0} max={MAX_MINUTE} />
            </Form.Item>
          </Space>
        )}

        {values.mode === "interval" && (
          <Space size="middle" align="start">
            <Form.Item
              label={`시 (0~${MAX_HOUR})`}
              name="hour"
              rules={rangeRules("시를 입력하세요.", 0, MAX_HOUR)}
            >
              <InputNumber min={0} max={MAX_HOUR} />
            </Form.Item>
            <Form.Item
              label={`시작 분 (0~${MAX_MINUTE})`}
              name="startMinute"
              rules={rangeRules("시작 분을 입력하세요.", 0, MAX_MINUTE)}
            >
              <InputNumber min={0} max={MAX_MINUTE} />
            </Form.Item>
            <Form.Item
              label={`간격 (분, 1~${MAX_MINUTE})`}
              name="intervalMinutes"
              rules={rangeRules("간격을 입력하세요.", 1, MAX_MINUTE)}
            >
              <InputNumber min={1} max={MAX_MINUTE} />
            </Form.Item>
          </Space>
        )}

        {values.mode === "hourlyRange" && (
          <>
            <Space size="middle" align="start">
              <Form.Item
                label={`시작 시 (0~${MAX_HOUR})`}
                name="startHour"
                rules={rangeRules("시작 시를 입력하세요.", 0, MAX_HOUR)}
              >
                <InputNumber min={0} max={MAX_HOUR} />
              </Form.Item>
              <Form.Item
                label={`종료 시 (0~${MAX_HOUR})`}
                name="endHour"
                // 시작 시가 바뀌면 종료 시 규칙을 다시 확인해야 한다.
                dependencies={["startHour"]}
                rules={[
                  ...rangeRules("종료 시를 입력하세요.", 0, MAX_HOUR),
                  ({ getFieldValue }) => ({
                    validator: (_rule, value) => {
                      const startHour: unknown = getFieldValue("startHour");
                      if (!isNumber(value) || !isNumber(startHour) || startHour <= value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("종료 시는 시작 시보다 빠를 수 없습니다."));
                    },
                  }),
                ]}
              >
                <InputNumber min={0} max={MAX_HOUR} />
              </Form.Item>
              <Form.Item
                label={`분 (0~${MAX_MINUTE})`}
                name="minute"
                rules={rangeRules("분을 입력하세요.", 0, MAX_MINUTE)}
              >
                <InputNumber min={0} max={MAX_MINUTE} />
              </Form.Item>
            </Space>
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary">시작 시는 종료 시보다 늦을 수 없습니다.</Text>
            </div>
          </>
        )}

        {values.mode === "manual" && (
          <Form.Item
            label="크론 식"
            name="cronExpression"
            extra={<Text type="secondary">Spring 크론 형식(초 분 시 일 월 요일)입니다. 예: 0 0 9 * * *</Text>}
            rules={[{ required: true, whitespace: true, message: "크론 식을 입력하세요." }]}
          >
            <Input maxLength={100} placeholder="0 0 9 * * *" />
          </Form.Item>
        )}

        {/* 구조화 입력을 되돌려 만든 식은 원래 식과 달라질 수 있다. 저장 전에 항상 보여준다. */}
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary">생성될 크론 식</Text>
          <div>
            <Text code>{preview ?? "-"}</Text>
            {preview && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                {describeCron(preview)}
              </Text>
            )}
          </div>
        </div>

      </Form>
    </Modal>
  );
}
