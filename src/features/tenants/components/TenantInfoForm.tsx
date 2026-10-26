"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  theme,
} from "antd";
import type { DatePickerProps, FormInstance, InputNumberProps, InputProps, InputRef } from "antd";
import { CalendarOutlined, CloseCircleFilled } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import dayjsGenerateConfig from "@rc-component/picker/generate/dayjs";
import { commitDateInput, parseDateInput, TENANT_DATE_INPUT_FORMATS } from "@/components/date-input";

import { RENT_CHARGE_FREQUENCY_OPTIONS, normalizeRentChargeFrequency } from "../rentChargeFrequency";
import { BILLING_TIMING_OPTIONS, normalizeBillingTiming } from "../billingTiming";
import type { RentChargeFrequency, BillingTiming, ContractType, TenantDetail, UpdateTenantRequest } from "../types";
import styles from "./TenantInfoForm.module.css";

// Picker와 blur 확정이 같은 두 자리 연도 정책을 사용하도록 폼에만 파서를 적용한다.
const TenantDatePicker = DatePicker.generatePicker<Dayjs>({
  ...dayjsGenerateConfig,
  locale: {
    ...dayjsGenerateConfig.locale,
    parse(locale, text, formats) {
      if (formats.includes("YYMMDD") && /^\d{6}$/.test(text)) {
        const parsed = parseDateInput(text, formats);
        return parsed.isValid() ? parsed : null;
      }
      return dayjsGenerateConfig.locale.parse(locale, text, formats);
    },
  },
});

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

// 월말·윤년에도 연속 클릭한 기간을 원래 시작일에 합산해 날짜가 밀리지 않게 한다.
function extendContractEndDate(startDate: Dayjs, endDate: Dayjs | null | undefined, months: number): Dayjs {
  if (!endDate?.isValid() || endDate.isBefore(startDate, "day")) {
    return getContractEndDate(startDate, months);
  }
  const difference = (endDate.year() - startDate.year()) * 12 + endDate.month() - startDate.month();
  for (const elapsed of [difference, difference + 1]) {
    if (elapsed > 0 && getContractEndDate(startDate, elapsed).isSame(endDate, "day")) {
      return getContractEndDate(startDate, elapsed + months);
    }
  }
  return getContractEndDate(endDate.add(1, "day"), months);
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
  rentChargeFrequency?: RentChargeFrequency;
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
  rentChargeFrequency: RentChargeFrequency;
  startDate: string | null;
  endDate: string | null;
};

type TenantInfoSourceValues = Omit<
  TenantInfoValues,
  "billingTiming" | "rentChargeFrequency" | "contractType" | "parkingEnabled" | "vehicleNumber"
> & {
  contractType?: ContractType | null;
  parkingEnabled?: boolean | null;
  vehicleNumber?: string | null;
  billingTiming?: BillingTiming | null;
  rentChargeFrequency?: RentChargeFrequency | null;
};

function toWon(manwon: number | null | undefined): number | null {
  return manwon === null || manwon === undefined ? null : Math.round(manwon * 10_000);
}

const formatMoneyInput: NonNullable<InputNumberProps<number>["formatter"]> = (
  amount,
  { userTyping, input },
) => userTyping ? input : String(amount ?? "");

// 서버 AdminTenantContactPhone과 같은 010 휴대폰·국내 지역번호 일반전화 규칙.
const CONTACT_PHONE_PATTERN = /^(?:010-[0-9]{4}|(?:02|0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4]))-[0-9]{3,4})-[0-9]{4}$/;

// 서울(02)은 두 자리, 나머지는 세 자리 지역번호로 구분한다. 서버는 대시 포함 형식을 쓴다.
export function formatPhone(raw?: string): string | undefined {
  if (raw === undefined) {
    return raw;
  }
  const digits = raw.replace(/\D/g, "");
  const prefixLength = digits.startsWith("02") ? 2 : 3;
  if (digits.length <= prefixLength) {
    return digits;
  }
  if (digits.length < prefixLength + 5) {
    return `${digits.slice(0, prefixLength)}-${digits.slice(prefixLength)}`;
  }
  const middleEnd = prefixLength + (digits.length < prefixLength + 8 ? 3 : 4);
  return `${digits.slice(0, prefixLength)}-${digits.slice(prefixLength, middleEnd)}-${digits.slice(middleEnd)}`;
}

export function toTenantValues(form: TenantInfoFormValues): TenantInfoValues {
  const contractType = form.contractType ?? "ROOM";
  const parkingEnabled = contractType === "PARKING" || form.parkingEnabled === true;
  const room = form.room?.trim();
  const rentChargeFrequency = normalizeRentChargeFrequency(form.rentChargeFrequency);
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
    // 기간 일시납 후불은 서버 도메인에서 허용하지 않는다. UI 상태가 어긋나도 writer 경계에서 선불로 보정한다.
    billingTiming:
      rentChargeFrequency === "ONE_TIME" ? "PREPAID" : normalizeBillingTiming(form.billingTiming),
    rentChargeFrequency,
    startDate: form.startDate ? form.startDate.format("YYYY-MM-DD") : null,
    endDate: form.endDate ? form.endDate.format("YYYY-MM-DD") : null,
  };
}

// 서버 계약 형태의 값을 폼 형태로 되돌린다 (B접두 호실 분해, 원 → 만원, 전화번호 대시 포맷).
export function fromTenantValues(values: TenantInfoSourceValues): TenantInfoFormValues {
  const contractType = values.contractType ?? "ROOM";
  const parkingEnabled = contractType === "PARKING" || values.parkingEnabled === true;
  const roomNumber = String(values.roomNumber ?? "").trim();
  const basement = contractType === "ROOM" && /^B\d+$/.test(roomNumber);
  const rentChargeFrequency = normalizeRentChargeFrequency(values.rentChargeFrequency);
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
      rentChargeFrequency === "ONE_TIME" ? "PREPAID" : normalizeBillingTiming(values.billingTiming),
    rentChargeFrequency,
    rentManwon: values.rentPrice != null ? values.rentPrice / 10_000 : undefined,
    maintenanceFeeManwon: values.maintenanceFee != null ? values.maintenanceFee / 10_000 : undefined,
    depositManwon: values.depositAmount != null ? values.depositAmount / 10_000 : undefined,
  };
}

// 등록된 임차인 값을 폼 형태로 되돌린다 (과거 숫자 호실도 문자열로 정규화).
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
      values?.rentChargeFrequency != null &&
      !(values.rentChargeFrequency === "ONE_TIME" && values.billingTiming === "POSTPAID") &&
      (values.rentChargeFrequency !== "ONE_TIME" || values.endDate?.isValid()) &&
      (values.rentManwon ?? 0) >= 0,
  );
}

function DateClearIcon() {
  return <CloseCircleFilled ref={(icon) => {
    // Picker는 지우기 버튼의 tabIndex를 노출하지 않아 공개 아이콘 슬롯에서 해당 버튼만 조정한다.
    const button = icon?.closest("button");
    if (button) button.tabIndex = -1;
  }} />;
}

// DatePicker에는 Input의 addonAfter가 없어서, "일"·"만원" addon과 같은 룩의
// 달력 버튼을 Space.Compact로 붙인다. 숫자 6·8자리도 엄격히 파싱하고 첫 포맷으로 표시한다.
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
    commitDateInput(target, TENANT_DATE_INPUT_FORMATS, form.getFieldValue(field), commitDate);
  }

  return (
    <Space.Compact data-tenant-date-field={field} style={{ width: "100%" }}>
      <TenantDatePicker
        {...pickerProps}
        allowClear={pickerProps.allowClear === false ? false : { clearIcon: <DateClearIcon /> }}
        value={value ?? null}
        onChange={commitDate}
        format={TENANT_DATE_INPUT_FORMATS}
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
        tabIndex={-1}
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
  value,
  onChange,
  placeholder,
  disabled,
  style,
  ...inputProps
}: InputNumberProps<number> & { label: string }) {
  const [unit, setUnit] = useState<"만원" | "원">("만원");
  const { status } = Form.Item.useStatus();
  const { token } = theme.useToken();
  const inWon = unit === "원";
  const nextUnit = inWon ? "만원" : "원";

  return (
    <Space.Compact block>
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
        tabIndex={-1}
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
  oneTime,
  style,
  ...paymentDayProps
}: InputNumberProps<number> & { billingTimingEditable: boolean; oneTime: boolean }) {
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
            disabled: oneTime && option.value === "POSTPAID",
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

export function TenantInfoFormFields({
  form,
  contractTypeEditable = false,
  billingTimingEditable,
  rentChargeFrequencyEditable,
}: {
  form: FormInstance<TenantInfoFormValues>;
  contractTypeEditable?: boolean;
  billingTimingEditable: boolean;
  rentChargeFrequencyEditable: boolean;
}) {
  const endDateInputId = useId();
  const phoneInputRef = useRef<InputRef>(null);
  const { token } = theme.useToken();
  const phone: string | undefined = Form.useWatch("phone", form);
  const contractType: ContractType = Form.useWatch("contractType", form) ?? "ROOM";
  const parkingEnabled = Form.useWatch("parkingEnabled", form);
  const isParking = contractType === "PARKING";
  const isRoom = contractType === "ROOM";
  const roomLabel = contractType === "OTHERS" ? "공간 이름" : "호실";
  const basement = Form.useWatch("basement", form);
  const startDate: Dayjs | null | undefined = Form.useWatch("startDate", form);
  const endDate: Dayjs | null | undefined = Form.useWatch("endDate", form);
  const rentChargeFrequency = normalizeRentChargeFrequency(Form.useWatch("rentChargeFrequency", form));
  const oneTime = rentChargeFrequency === "ONE_TIME";
  const rentLabel = oneTime ? (isParking ? "계약기간 주차비 총액" : "계약기간 임대료 총액")
    : (isParking ? "월 주차비" : "월 임대료");
  const oneTimeStartDateImmutable =
    rentChargeFrequency === "ONE_TIME" && !rentChargeFrequencyEditable;
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
                rules={[{
                  required: true,
                  whitespace: true,
                  message: `${roomLabel}을 입력해 주세요.`,
                }, ({ getFieldValue }) => ({
                  validator(_, value: string | undefined) {
                    const limit = (getFieldValue("contractType") ?? "ROOM") === "ROOM" && getFieldValue("basement") ? 254 : 255;
                    return !value || value.length <= limit
                      ? Promise.resolve()
                      : Promise.reject(new Error(`${roomLabel}은 ${limit}자 이내로 입력해 주세요.`));
                  },
                })]}
              >
                {isRoom ? (
                  <TextInputWithAddon
                    maxLength={basement ? 254 : 255}
                    placeholder="예: 101, A동 101"
                    addon="호"
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
          extra={<div className={styles.shortcuts}><Space size={8} wrap>
            <Button
              htmlType="button"
              size="small"
              shape="round"
              className={styles.phoneShortcut}
              aria-label="010 입력"
              disabled={phone?.trim() ? true : undefined}
              onClick={() => {
                if (form.getFieldValue("phone")?.trim()) return;
                form.setFieldValue("phone", "010");
                phoneInputRef.current?.focus({ cursor: "end", preventScroll: true });
              }}
            >010</Button>
          </Space></div>}
          rules={[
            { required: true, message: "연락처를 입력해 주세요." },
            { pattern: CONTACT_PHONE_PATTERN, message: "010 휴대폰 또는 지역번호를 포함한 일반전화 번호를 입력해 주세요." },
          ]}
        >
          <Input ref={phoneInputRef} type="tel" placeholder="010-1234-5678 또는 031-123-4567" inputMode="numeric" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          label="임대료 납부 유형"
          name="rentChargeFrequency"
          rules={[{ required: true, message: "임대료 납부 유형을 선택해 주세요." }]}
          extra={oneTime
            ? "계약기간 전체 임대료를 시작월에 한 번만 청구합니다. 12개월이 지나도 다시 청구하지 않으며 관리비는 별도 월별 청구입니다."
            : "계약 기간 동안 매월 임대료와 관리비를 청구합니다."}
        >
          <Radio.Group
            aria-label="임대료 납부 유형"
            block
            optionType="button"
            buttonStyle="solid"
            options={RENT_CHARGE_FREQUENCY_OPTIONS}
            disabled={!rentChargeFrequencyEditable}
            onChange={(event) => {
              if (event.target.value === "ONE_TIME") form.setFieldValue("billingTiming", "PREPAID");
              void form.validateFields(["endDate"]).catch(() => undefined);
            }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="계약 시작일"
          name="startDate"
          extra={
            oneTimeStartDateImmutable
              ? "계약기간 일시납의 시작일은 등록 후 수정할 수 없습니다."
              : undefined
          }
          rules={[{ required: true, message: "계약 시작일을 선택해 주세요." }]}
        >
          <DateAddonPicker
            field="startDate"
            placeholder={dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD")}
            disabled={oneTimeStartDateImmutable || undefined}
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
          required={oneTime}
          htmlFor={endDateInputId}
          name="endDate"
          dependencies={["startDate", "rentChargeFrequency"]}
          extra={<div className={styles.shortcuts} role="group" aria-label="계약 기간 빠른 선택"><Space size={4} wrap>
            {CONTRACT_DURATION_OPTIONS.map(({ label, months }) => {
              const nextEndDate = startDate?.isValid() ? extendContractEndDate(startDate, endDate, months) : null;
              return (
                <Button
                  key={months}
                  size="small"
                  shape="round"
                  htmlType="button"
                  disabled={!nextEndDate || undefined}
                  title={nextEndDate ? `${nextEndDate.format("YYYY-MM-DD")}까지` : "계약 시작일을 먼저 선택해 주세요."}
                  onClick={(event) => {
                    // 날짜 blur 확정과 연속 클릭하면 useWatch보다 Form 값이 먼저 갱신된다.
                    const currentStart: Dayjs | null | undefined = form.getFieldValue("startDate");
                    if (event.currentTarget.hasAttribute("disabled") || !dayjs.isDayjs(currentStart) || !currentStart.isValid()) return;
                    form.setFieldValue("endDate", extendContractEndDate(currentStart, form.getFieldValue("endDate"), months));
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
                if (getFieldValue("rentChargeFrequency") === "ONE_TIME" && !value) {
                  return Promise.reject(new Error("계약기간 일시납은 계약 종료일이 필요합니다."));
                }
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
          extra={oneTime
            ? "첫 납기는 시작월의 이 날짜이며 시작일보다 이르면 시작일에 납부합니다. 관리비는 이후 월별로 청구합니다."
            : "1~31 사이의 날짜를 입력하세요."}
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
            oneTime={oneTime}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label={rentLabel}
          name="rentManwon"
          extra={oneTime ? (rentChargeFrequencyEditable
            ? "계약 기간 전체의 합의 금액입니다. 기간을 바꿔도 자동 환산하지 않습니다."
            : "총액은 최초 납기 전이며 시작월에 납부 기록이 없을 때만 정정할 수 있습니다.") : undefined}
          rules={[{ type: "number", min: 0, message: "임대료는 0 이상이어야 합니다." }]}
        >
          <MoneyInputWithUnit
            label={rentLabel}
            min={0}
            placeholder="50"
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          label="월 관리비"
          name="maintenanceFeeManwon"
          rules={[{ type: "number", min: 0, message: "관리비는 0 이상이어야 합니다." }]}
        >
          <MoneyInputWithUnit min={0} label="월 관리비" placeholder="0" />
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
