"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
} from "antd";
import type { FormInstance } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import type { TenantDetail } from "../types";

// 모바일 앱의 "세입자 추가" 폼과 같은 구조·순서를 공유하는 임차인 정보 폼.
// 계약서 검수(입력·수정)와 임차인 수정 드로어가 함께 사용한다 (금액은 만원 단위).
export type TenantInfoFormValues = {
  room?: string;
  basement?: boolean;
  name?: string;
  phone?: string;
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  paymentDay?: number | null;
  rentManwon?: number | null;
  maintenanceFeeManwon?: number | null;
  depositManwon?: number | null;
};

// 서버 계약 형태(원 단위, B접두 호실, 대시 포함 전화번호)로 정규화한 값.
export type TenantInfoValues = {
  name: string | null;
  roomNumber: string | null;
  phone: string | null;
  rentPrice: number | null;
  maintenanceFee: number | null;
  depositAmount: number | null;
  paymentDay: number | null;
  startDate: string | null;
  endDate: string | null;
};

function toWon(manwon: number | null | undefined): number | null {
  return manwon === null || manwon === undefined ? null : Math.round(manwon * 10_000);
}

// 숫자만 입력해도 010-1111-2222 형태로 자동 포맷한다. 서버·기존 데이터 모두 대시 포함 형식을 쓴다.
export function formatPhone(raw?: string): string | undefined {
  if (raw === undefined) {
    return raw;
  }
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) {
    return digits;
  }
  if (digits.length < 8) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length < 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function toTenantValues(form: TenantInfoFormValues): TenantInfoValues {
  const room = form.room?.trim();
  return {
    name: form.name?.trim() || null,
    roomNumber: room ? `${form.basement ? "B" : ""}${room}` : null,
    phone: form.phone?.trim() || null,
    rentPrice: toWon(form.rentManwon),
    // 서버 등록 검증이 보증금 null을 거부하므로, 안내 문구대로 비워 두면 0으로 보낸다.
    maintenanceFee: toWon(form.maintenanceFeeManwon) ?? 0,
    depositAmount: toWon(form.depositManwon) ?? 0,
    paymentDay: form.paymentDay ?? null,
    startDate: form.startDate ? form.startDate.format("YYYY-MM-DD") : null,
    endDate: form.endDate ? form.endDate.format("YYYY-MM-DD") : null,
  };
}

// 서버 계약 형태의 값을 폼 형태로 되돌린다 (B접두 호실 분해, 원 → 만원, 전화번호 대시 포맷).
export function fromTenantValues(values: TenantInfoValues): TenantInfoFormValues {
  const roomNumber = String(values.roomNumber ?? "").trim();
  const basement = roomNumber.startsWith("B");
  return {
    room: basement ? roomNumber.slice(1) : roomNumber,
    basement,
    name: values.name ?? undefined,
    phone: values.phone ? formatPhone(values.phone) : undefined,
    startDate: values.startDate ? dayjs(values.startDate) : null,
    endDate: values.endDate ? dayjs(values.endDate) : null,
    paymentDay: values.paymentDay,
    rentManwon: values.rentPrice != null ? values.rentPrice / 10_000 : undefined,
    maintenanceFeeManwon: values.maintenanceFee != null ? values.maintenanceFee / 10_000 : undefined,
    depositManwon: values.depositAmount != null ? values.depositAmount / 10_000 : undefined,
  };
}

// 등록된 임차인 값을 폼 형태로 되돌린다 (호실은 숫자로 내려와 문자열로 정규화).
export function fromTenantDetail(tenant: TenantDetail): TenantInfoFormValues {
  return fromTenantValues({
    ...tenant,
    roomNumber: String(tenant.roomNumber ?? ""),
    maintenanceFee: tenant.maintenanceFee ?? null,
    depositAmount: tenant.depositAmount ?? null,
  });
}

export function isTenantFormComplete(values?: TenantInfoFormValues): boolean {
  return Boolean(
    values?.room?.trim() &&
      values?.name?.trim() &&
      values?.phone?.trim() &&
      values?.startDate &&
      values?.paymentDay != null &&
      values?.rentManwon != null &&
      values.rentManwon > 0,
  );
}

// DatePicker에는 Input의 addonAfter가 없어서, "일"·"만원" addon과 같은 룩의
// 달력 버튼을 Space.Compact로 붙인다. 직접 타이핑(YYYY-MM-DD)은 그대로 동작한다.
function DateAddonPicker({
  value,
  onChange,
  placeholder,
}: {
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Space.Compact style={{ width: "100%" }}>
      <DatePicker
        value={value ?? null}
        onChange={(next) => onChange?.(next)}
        format="YYYY-MM-DD"
        placeholder={placeholder}
        style={{ width: "100%" }}
        open={open}
        onOpenChange={setOpen}
        suffixIcon={null}
      />
      <Button icon={<CalendarOutlined />} aria-label="날짜 선택" onClick={() => setOpen(true)} />
    </Space.Compact>
  );
}

export function TenantInfoFormFields({ form }: { form: FormInstance<TenantInfoFormValues> }) {
  const basement = Form.useWatch("basement", form);
  return (
    <Row gutter={12}>
      <Col span={16}>
        <Form.Item
          label="호실"
          name="room"
          required
          normalize={(value?: string) => value?.replace(/\D/g, "")}
        >
          <Input
            maxLength={10}
            placeholder="123"
            addonAfter="호"
            inputMode="numeric"
            prefix={
              <span style={{ fontWeight: 600, display: basement ? "inline" : "none" }}>B</span>
            }
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label=" " name="basement" valuePropName="checked">
          <Checkbox>지하</Checkbox>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="세입자 이름" name="name" required>
          <Input maxLength={100} placeholder="홍길동" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="연락처"
          name="phone"
          required
          normalize={formatPhone}
          rules={[{ pattern: /^0\d{1,2}-\d{3,4}-\d{4}$/, message: "전화번호 형식이 아닙니다." }]}
        >
          <Input placeholder="010-1111-2222" inputMode="numeric" maxLength={13} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="계약 시작일" name="startDate" required>
          <DateAddonPicker
            placeholder={dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD")}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="계약 종료일"
          name="endDate"
          dependencies={["startDate"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value: Dayjs | null | undefined) {
                const start: Dayjs | null | undefined = getFieldValue("startDate");
                if (!value || !start || !value.isBefore(start, "day")) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("종료일은 시작일보다 빠를 수 없습니다."));
              },
            }),
          ]}
        >
          <DateAddonPicker
            placeholder={dayjs()
              .add(1, "month")
              .startOf("month")
              .add(2, "year")
              .subtract(1, "day")
              .format("YYYY-MM-DD")}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="납부일 (1~31)" name="paymentDay" required>
          <InputNumber min={1} max={31} style={{ width: "100%" }} addonAfter="일" placeholder="25" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="월세" name="rentManwon" required>
          <InputNumber min={1} style={{ width: "100%" }} addonAfter="만원" placeholder="50" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="관리비" name="maintenanceFeeManwon">
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="만원" placeholder="0" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="보증금" name="depositManwon">
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="만원" placeholder="0" />
        </Form.Item>
      </Col>
    </Row>
  );
}
