"use client";

import { useId, useState, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  theme,
} from "antd";
import type { DatePickerProps, FormInstance, InputNumberProps, InputProps } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { commitDateInput } from "@/components/date-input";

import { BILLING_CYCLE_OPTIONS, normalizeBillingCycle } from "../billingCycle";
import { BILLING_TIMING_OPTIONS, normalizeBillingTiming } from "../billingTiming";
import type { BillingCycle, BillingTiming, ContractType, TenantDetail, UpdateTenantRequest } from "../types";
import styles from "./TenantInfoForm.module.css";

const CONTRACT_TYPE_OPTIONS = [
  { value: "ROOM", label: "세대" },
  { value: "COMMERCIAL", label: "상가" },
  { value: "PARKING", label: "주차" },
  { value: "OTHERS", label: "기타" },
];

const CONTRACT_DURATION_OPTIONS = [
  { label: "2년", months: 24 },
  { label: "1년", months: 12 },
  { label: "6개월", months: 6 },
];

// 모바일과 같이 시작일을 포함한다. 같은 일자가 없는 달에는 말일을 종료일로 쓴다.
function getContractEndDate(startDate: Dayjs, months: number): Dayjs {
  const anniversary = startDate.add(months, "month");
  return anniversary.date() < startDate.date() ? anniversary : anniversary.subtract(1, "day");
}

// 모바일 앱의 "세입자 추가" 폼과 같은 구조·순서를 공유하는 임차인 정보 폼.
// 계약서 검수(입력·수정)와 임차인 수정 드로어가 함께 사용한다.
// 폼 값은 만원 단위를 유지하고 금액 입력의 표시 단위만 원/만원으로 바꾼다.
export type TenantInfoFormValues = {
  contractType?: ContractType;
  parkingEnabled?: boolean;
  vehicleNumber?: string;
  room?: string;
  basement?: boolean;
  name?: string;
  phone?: string;
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  paymentDay?: number | null;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming?: BillingTiming;
  rentBillingCycle?: BillingCycle;
  rentManwon?: number | null;
  maintenanceFeeManwon?: number | null;
  depositManwon?: number | null;
};

// 서버 계약 형태(원 단위, B접두 호실, 대시 포함 전화번호)로 정규화한 값.
export type TenantInfoValues = {
  contractType: ContractType;
  parkingEnabled: boolean;
  vehicleNumber: string | null;
  name: string | null;
  roomNumber: string | null;
  phone: string | null;
  rentPrice: number | null;
  maintenanceFee: number | null;
  depositAmount: number | null;
  paymentDay: number | null;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming;
  rentBillingCycle: BillingCycle;
  startDate: string | null;
  endDate: string | null;
};

type TenantInfoSourceValues = Omit<
  TenantInfoValues,
  "billingTiming" | "rentBillingCycle" | "contractType" | "parkingEnabled" | "vehicleNumber"
> & {
  contractType?: ContractType | null;
  parkingEnabled?: boolean | null;
  vehicleNumber?: string | null;
  billingTiming?: BillingTiming | null;
  rentBillingCycle?: BillingCycle | null;
};

function toWon(manwon: number | null | undefined): number | null {
  return manwon === null || manwon === undefined ? null : Math.round(manwon * 10_000);
}

const formatMoneyInput: NonNullable<InputNumberProps<number>["formatter"]> = (
  amount,
  { userTyping, input },
) => userTyping ? input : String(amount ?? "");

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
  const contractType = form.contractType ?? "ROOM";
  const parkingEnabled = contractType === "PARKING" || form.parkingEnabled === true;
  const room = form.room?.trim();
  const rentBillingCycle = normalizeBillingCycle(form.rentBillingCycle);
  return {
    contractType,
    parkingEnabled,
    vehicleNumber: parkingEnabled ? form.vehicleNumber?.trim() || null : null,
    name: form.name?.trim() || null,
    roomNumber:
      contractType === "PARKING" || !room
        ? null
        : `${contractType === "ROOM" && form.basement ? "B" : ""}${room}`,
    phone: form.phone?.trim() || null,
    // 선택 금액은 비워 두면 0원으로 등록·수정한다.
    rentPrice: toWon(form.rentManwon) ?? 0,
    maintenanceFee: toWon(form.maintenanceFeeManwon) ?? 0,
    depositAmount: toWon(form.depositManwon) ?? 0,
    paymentDay: form.paymentDay ?? null,
    // 연세 후불은 서버 도메인에서 허용하지 않는다. UI 상태가 어긋나도 writer 경계에서 선불로 보정한다.
    billingTiming:
      rentBillingCycle === "YEARLY" ? "PREPAID" : normalizeBillingTiming(form.billingTiming),
    rentBillingCycle,
    startDate: form.startDate ? form.startDate.format("YYYY-MM-DD") : null,
    endDate: form.endDate ? form.endDate.format("YYYY-MM-DD") : null,
  };
}

// 서버 계약 형태의 값을 폼 형태로 되돌린다 (B접두 호실 분해, 원 → 만원, 전화번호 대시 포맷).
export function fromTenantValues(values: TenantInfoSourceValues): TenantInfoFormValues {
  const contractType = values.contractType ?? "ROOM";
  const parkingEnabled = contractType === "PARKING" || values.parkingEnabled === true;
  const roomNumber = String(values.roomNumber ?? "").trim();
  const basement = contractType === "ROOM" && roomNumber.startsWith("B");
  const rentBillingCycle = normalizeBillingCycle(values.rentBillingCycle);
  return {
    contractType,
    parkingEnabled,
    vehicleNumber: parkingEnabled ? values.vehicleNumber ?? undefined : undefined,
    room: contractType === "PARKING" ? undefined : basement ? roomNumber.slice(1) : roomNumber,
    basement,
    name: values.name ?? undefined,
    phone: values.phone ? formatPhone(values.phone) : undefined,
    startDate: values.startDate ? dayjs(values.startDate) : null,
    endDate: values.endDate ? dayjs(values.endDate) : null,
    paymentDay: values.paymentDay,
    billingTiming:
      rentBillingCycle === "YEARLY" ? "PREPAID" : normalizeBillingTiming(values.billingTiming),
    rentBillingCycle,
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

export function toUpdateTenantRequest(form: TenantInfoFormValues): UpdateTenantRequest {
  const values = toTenantValues(form);
  return {
    parkingEnabled: values.parkingEnabled,
    vehicleNumber: values.vehicleNumber ?? undefined,
    clearVehicleNumber: values.parkingEnabled && values.vehicleNumber === null ? true : undefined,
    name: values.name ?? undefined,
    roomNumber: values.roomNumber ?? undefined,
    phone: values.phone ?? undefined,
    rentPrice: values.rentPrice ?? undefined,
    maintenanceFee: values.maintenanceFee ?? undefined,
    depositAmount: values.depositAmount ?? undefined,
    paymentDay: values.paymentDay ?? undefined,
    startDate: values.startDate ?? undefined,
    endDate: values.endDate ?? undefined,
  };
}

export function isTenantFormComplete(values?: TenantInfoFormValues): boolean {
  return Boolean(
    (values?.contractType === "PARKING" || values?.room?.trim()) &&
      values?.name?.trim() &&
      values?.phone?.trim() &&
      values?.startDate &&
      values?.paymentDay != null &&
      values?.billingTiming != null &&
      values?.rentBillingCycle != null &&
      !(values.rentBillingCycle === "YEARLY" && values.billingTiming === "POSTPAID") &&
      (values.rentManwon ?? 0) >= 0,
  );
}

// DatePicker에는 Input의 addonAfter가 없어서, "일"·"만원" addon과 같은 룩의
// 달력 버튼을 Space.Compact로 붙인다. 숫자 8자리도 엄격히 파싱하고 첫 포맷으로 표시한다.
function DateAddonPicker({
  field,
  value,
  onChange,
  disabled,
  style,
  ...pickerProps
}: {
  field: "startDate" | "endDate";
  onChange?: (value: Dayjs | null) => void;
} & Omit<DatePickerProps<Dayjs, false>, "onChange">) {
  const [open, setOpen] = useState(false);
  const form = Form.useFormInstance<TenantInfoFormValues>();

  function commitDate(next: Dayjs | null) {
    const current: Dayjs | null | undefined = form.getFieldValue(field);
    if ((!next && !current) || (next && dayjs.isDayjs(current) && current.isSame(next, "day"))) return;
    onChange?.(next);
  }

  function commitTypedInput(target: EventTarget | null) {
    if (disabled) return;
    commitDateInput(target, ["YYYY-MM-DD", "YYYYMMDD"], form.getFieldValue(field), commitDate);
  }

  return (
    <Space.Compact data-tenant-date-field={field} style={{ width: "100%" }}>
      <DatePicker
        {...pickerProps}
        value={value ?? null}
        onChange={commitDate}
        format={["YYYY-MM-DD", "YYYYMMDD"]}
        onBlur={(event, ...args) => {
          commitTypedInput(event.target);
          pickerProps.onBlur?.(event, ...args);
        }}
        onKeyDown={(event, ...args) => {
          // DatePicker의 날짜 확정은 유지하고 Enter로 폼 전체가 제출되는 기본 동작만 막는다.
          if (event.key === "Enter") event.preventDefault();
          pickerProps.onKeyDown?.(event, ...args);
        }}
        disabled={disabled}
        style={{ width: "100%", ...style }}
        open={open}
        onOpenChange={setOpen}
        suffixIcon={null}
      />
      <Button
        icon={<CalendarOutlined />}
        aria-label="날짜 선택"
        disabled={disabled}
        onClick={() => setOpen(true)}
      />
    </Space.Compact>
  );
}

function TextInputWithAddon({
  addon,
  style,
  ...inputProps
}: InputProps & { addon: ReactNode }) {
  const { status } = Form.Item.useStatus();
  const addonStatus = status === "error" || status === "warning" ? status : undefined;

  return (
    <Space.Compact block>
      <Input {...inputProps} style={{ width: "100%", ...style }} />
      <Space.Addon status={addonStatus}>{addon}</Space.Addon>
    </Space.Compact>
  );
}

function MoneyInputWithUnit({
  label,
  before,
  value,
  onChange,
  placeholder,
  disabled,
  style,
  ...inputProps
}: InputNumberProps<number> & { label: string; before?: ReactNode }) {
  const [unit, setUnit] = useState<"만원" | "원">("만원");
  const { status } = Form.Item.useStatus();
  const { token } = theme.useToken();
  const inWon = unit === "원";
  const nextUnit = inWon ? "만원" : "원";

  return (
    <Space.Compact block>
      {before}
      <InputNumber<number>
        {...inputProps}
        disabled={disabled}
        value={inWon ? toWon(value) : value}
        onChange={(next) => onChange?.(next === null || !inWon ? next : next / 10_000)}
        placeholder={inWon && placeholder ? String(Number(placeholder) * 10_000) : placeholder}
        precision={inWon ? 0 : 4}
        formatter={formatMoneyInput}
        style={{ flex: 1, minWidth: 0, ...style }}
      />
      <Button
        className={styles.moneyUnitButton}
        style={{
          background: token.colorFillAlter,
          borderColor: status === "error" ? token.colorError : status === "warning" ? token.colorWarning : undefined,
        }}
        htmlType="button"
        disabled={disabled}
        aria-label={`${label} ${unit} 단위, ${nextUnit}으로 전환`}
        title={`${nextUnit} 단위로 전환`}
        onClick={() => setUnit(nextUnit)}
      >
        {unit}
      </Button>
    </Space.Compact>
  );
}

function BillingScheduleInput({
  billingTimingEditable,
  yearly,
  style,
  ...paymentDayProps
}: InputNumberProps<number> & { billingTimingEditable: boolean; yearly: boolean }) {
  const { status } = Form.Item.useStatus();
  const addonStatus = status === "error" || status === "warning" ? status : undefined;

  return (
    <Space.Compact block>
      <Form.Item name="billingTiming" noStyle>
        <Select<BillingTiming>
          aria-label="납부 방식"
          disabled={!billingTimingEditable}
          options={BILLING_TIMING_OPTIONS.map((option) => ({
            ...option,
            disabled: yearly && option.value === "POSTPAID",
          }))}
          style={{ width: "min(80px, 48%)", flexShrink: 0 }}
        />
      </Form.Item>
      <InputNumber<number>
        {...paymentDayProps}
        style={{ flex: 1, minWidth: 0, ...style }}
      />
      <Space.Addon status={addonStatus}>일</Space.Addon>
    </Space.Compact>
  );
}

function RentScheduleInput({
  formInstance,
  rentBillingCycleEditable,
  label,
  ...rentProps
}: InputNumberProps<number> & {
  formInstance: FormInstance<TenantInfoFormValues>;
  rentBillingCycleEditable: boolean;
  label: string;
}) {
  return (
    <MoneyInputWithUnit
      {...rentProps}
      label={label}
      before={
        <Form.Item name="rentBillingCycle" noStyle>
          <Select<BillingCycle>
            aria-label="임대료 청구 주기"
            disabled={!rentBillingCycleEditable}
            options={BILLING_CYCLE_OPTIONS}
            style={{ width: "min(80px, 48%)", flexShrink: 0 }}
            onChange={(cycle) => {
              if (cycle === "YEARLY") {
                formInstance.setFieldValue("billingTiming", "PREPAID");
              }
            }}
          />
        </Form.Item>
      }
    />
  );
}

export function TenantInfoFormFields({
  form,
  contractTypeEditable = false,
  billingTimingEditable,
  rentBillingCycleEditable,
}: {
  form: FormInstance<TenantInfoFormValues>;
  contractTypeEditable?: boolean;
  billingTimingEditable: boolean;
  rentBillingCycleEditable: boolean;
}) {
  const endDateInputId = useId();
  const { token } = theme.useToken();
  const contractType: ContractType = Form.useWatch("contractType", form) ?? "ROOM";
  const parkingEnabled = Form.useWatch("parkingEnabled", form);
  const isParking = contractType === "PARKING";
  const isRoom = contractType === "ROOM";
  const roomLabel = contractType === "OTHERS" ? "공간 이름" : "호실";
  const basement = Form.useWatch("basement", form);
  const startDate: Dayjs | null | undefined = Form.useWatch("startDate", form);
  const endDate: Dayjs | null | undefined = Form.useWatch("endDate", form);
  const rentBillingCycle = normalizeBillingCycle(Form.useWatch("rentBillingCycle", form));
  const yearlyStartDateImmutable =
    rentBillingCycle === "YEARLY" && !rentBillingCycleEditable;
  return (
    <Row gutter={12} className={styles.fields}>
      <Col xs={24} sm={12}>
        <Form.Item
          label="카테고리"
          name="contractType"
          rules={[{ required: true, message: "카테고리를 선택해 주세요." }]}
        >
          <Select<ContractType>
            options={CONTRACT_TYPE_OPTIONS}
            disabled={!contractTypeEditable || undefined}
            onChange={(nextType) => {
              form.setFieldsValue({ room: undefined, basement: false });
              if (nextType === "PARKING" || isParking) {
                form.setFieldsValue({
                  parkingEnabled: nextType === "PARKING",
                  vehicleNumber: undefined,
                });
              }
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        {isParking ? (
          <Form.Item label="차량 번호" name="vehicleNumber">
            <Input maxLength={32} placeholder="예: 12가3456" />
          </Form.Item>
        ) : (
          <Row gutter={12} wrap={false}>
            <Col flex="1" style={{ minWidth: 0 }}>
              <Form.Item
                label={roomLabel}
                name="room"
                normalize={(value?: string) => isRoom ? value?.replace(/\D/g, "") : value}
                rules={[{
                  required: true,
                  whitespace: true,
                  message: `${roomLabel}을 입력해 주세요.`,
                }]}
              >
                {isRoom ? (
                  <TextInputWithAddon
                    maxLength={10}
                    placeholder="123"
                    addon="호"
                    inputMode="numeric"
                    prefix={
                      <span style={{ fontWeight: 600, display: basement ? "inline" : "none" }}>B</span>
                    }
                  />
                ) : (
                  <Input
                    maxLength={255}
                    placeholder={contractType === "COMMERCIAL" ? "예: 101, 1층 상가" : "예: 창고 A"}
                  />
                )}
              </Form.Item>
            </Col>
            {isRoom && (
              <Col flex="72px">
                <Form.Item label=" " name="basement" valuePropName="checked">
                  <Checkbox
                    styles={({ props }) => ({
                      label: {
                        color: props.checked || props.disabled ? undefined : token.colorTextTertiary,
                      },
                    })}
                  >
                    지하
                  </Checkbox>
                </Form.Item>
              </Col>
            )}
          </Row>
        )}
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="세입자 이름"
          name="name"
          rules={[{ required: true, whitespace: true, message: "세입자 이름을 입력해 주세요." }]}
        >
          <Input maxLength={100} placeholder="홍길동" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="연락처"
          name="phone"
          normalize={formatPhone}
          rules={[
            { required: true, message: "연락처를 입력해 주세요." },
            // 서버가 010-XXXX-XXXX(11자리)만 허용한다.
            { pattern: /^010-\d{4}-\d{4}$/, message: "010-1234-5678 형식(11자리)으로 입력해 주세요." },
          ]}
        >
          <Input placeholder="010-1111-2222" inputMode="numeric" maxLength={13} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="계약 시작일"
          name="startDate"
          extra={
            yearlyStartDateImmutable
              ? "연세 계약의 시작일은 등록 후 수정할 수 없습니다."
              : undefined
          }
          rules={[{ required: true, message: "계약 시작일을 선택해 주세요." }]}
        >
          <DateAddonPicker
            field="startDate"
            placeholder={dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD")}
            disabled={yearlyStartDateImmutable || undefined}
            onChange={(nextDate) => {
              if (nextDate && form.getFieldValue("paymentDay") == null) {
                form.setFieldValue("paymentDay", nextDate.date());
              }
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="계약 종료일"
          htmlFor={endDateInputId}
          name="endDate"
          dependencies={["startDate"]}
          extra={<div className={styles.durationShortcuts} role="group" aria-label="계약 기간 빠른 선택"><Space size={4} wrap>
            {CONTRACT_DURATION_OPTIONS.map(({ label, months }) => {
              const nextEndDate = startDate?.isValid() ? getContractEndDate(startDate, months) : null;
              const selected = Boolean(nextEndDate && endDate?.isSame(nextEndDate, "day"));
              return (
                <Button
                  key={months}
                  size="small"
                  shape="round"
                  htmlType="button"
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  aria-pressed={selected}
                  disabled={!nextEndDate || undefined}
                  title={nextEndDate ? `${nextEndDate.format("YYYY-MM-DD")}까지` : "계약 시작일을 먼저 선택해 주세요."}
                  onClick={(event) => {
                    // 날짜 blur 확정과 연속 클릭하면 useWatch보다 Form 값이 먼저 갱신된다.
                    const currentStart: Dayjs | null | undefined = form.getFieldValue("startDate");
                    if (event.currentTarget.hasAttribute("disabled") || !dayjs.isDayjs(currentStart) || !currentStart.isValid()) return;
                    form.setFieldValue("endDate", getContractEndDate(currentStart, months));
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Space></div>}
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
            field="endDate"
            id={endDateInputId}
            placeholder={dayjs()
              .add(1, "month")
              .startOf("month")
              .add(2, "year")
              .subtract(1, "day")
              .format("YYYY-MM-DD")}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="납부일"
          name="paymentDay"
          extra="1~31 사이의 날짜를 입력하세요."
          rules={[
            { required: true, message: "납부일을 입력해 주세요." },
            { type: "number", min: 1, max: 31, message: "1~31 사이의 날짜만 가능합니다." },
          ]}
        >
          <BillingScheduleInput
            min={1}
            max={31}
            placeholder="25"
            billingTimingEditable={billingTimingEditable}
            yearly={rentBillingCycle === "YEARLY"}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label={isParking ? "주차비" : "임대료"}
          name="rentManwon"
          rules={[{ type: "number", min: 0, message: "임대료는 0 이상이어야 합니다." }]}
        >
          <RentScheduleInput
            formInstance={form}
            label={isParking ? "주차비" : "임대료"}
            min={0}
            placeholder="50"
            rentBillingCycleEditable={rentBillingCycleEditable}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="관리비"
          name="maintenanceFeeManwon"
          rules={[{ type: "number", min: 0, message: "관리비는 0 이상이어야 합니다." }]}
        >
          <MoneyInputWithUnit min={0} label="관리비" placeholder="0" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="보증금"
          name="depositManwon"
          rules={[{ type: "number", min: 0, message: "보증금은 0 이상이어야 합니다." }]}
        >
          <MoneyInputWithUnit min={0} label="보증금" placeholder="0" />
        </Form.Item>
      </Col>
      {!isParking && (
        <Col span={24}>
          <Form.Item name="parkingEnabled" valuePropName="checked">
            <Checkbox
              onChange={(event) => {
                if (!event.target.checked) {
                  form.setFieldValue("vehicleNumber", undefined);
                }
              }}
            >
              주차 이용
            </Checkbox>
          </Form.Item>
        </Col>
      )}
      {!isParking && parkingEnabled && (
        <Col span={24}>
          <Form.Item label="차량 번호 (선택)" name="vehicleNumber">
            <Input maxLength={32} placeholder="예: 12가3456" />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
}
