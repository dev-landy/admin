import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Button, Form } from "antd";
import dayjs from "dayjs";

import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantValues,
  toTenantValues,
  toUpdateTenantRequest,
} from "@/features/tenants/components/TenantInfoForm";
import type { BillingCycle } from "@/features/tenants/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

class TestMessageChannel {
  port1 = { onmessage: null as (() => void) | null };
  port2 = {
    postMessage: () => setTimeout(() => this.port1.onmessage?.(), 0),
  };
}

Object.defineProperty(global, "MessageChannel", { value: TestMessageChannel });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function TestForm({
  onFinish,
  billingTimingEditable = true,
  rentBillingCycleEditable = true,
  initialRentBillingCycle = "MONTHLY",
}: {
  onFinish: (values: TenantInfoFormValues) => void;
  billingTimingEditable?: boolean;
  rentBillingCycleEditable?: boolean;
  initialRentBillingCycle?: BillingCycle;
}) {
  const [form] = Form.useForm<TenantInfoFormValues>();

  return (
    <Form
      form={form}
      initialValues={{
        room: "101",
        basement: false,
        name: "홍길동",
        phone: "010-1111-2222",
        startDate: dayjs("2026-09-01"),
        paymentDay: 25,
        billingTiming: "PREPAID",
        rentBillingCycle: initialRentBillingCycle,
        rentManwon: 50,
        maintenanceFeeManwon: 5,
        depositManwon: 1_000,
      }}
      onFinish={onFinish}
    >
      <TenantInfoFormFields
        form={form}
        billingTimingEditable={billingTimingEditable}
        rentBillingCycleEditable={rentBillingCycleEditable}
      />
      <Button htmlType="submit">저장</Button>
    </Form>
  );
}

test("납부 방식 Select와 납부일 입력이 Form.Item 값 바인딩을 유지한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);

  expect(screen.getByLabelText("호실")).toHaveValue("101");
  expect(screen.getByLabelText("납부일")).toHaveValue("25");
  expect(screen.getByText("선불")).toBeInTheDocument();
  expect(screen.getByText("매월")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("호실"), { target: { value: "202" } });
  fireEvent.mouseDown(screen.getByLabelText("납부 방식"));
  fireEvent.click(await screen.findByText("후불"));
  fireEvent.change(screen.getByLabelText("납부일"), { target: { value: "15" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(onFinish).toHaveBeenCalledWith(
    expect.objectContaining({
      room: "202",
      paymentDay: 15,
      billingTiming: "POSTPAID",
    }),
  );
});

test("연세를 선택하면 선불로 맞추고 후불 선택을 차단한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);

  fireEvent.mouseDown(screen.getByLabelText("납부 방식"));
  fireEvent.click(await screen.findByText("후불"));
  fireEvent.mouseDown(screen.getByLabelText("임대료 청구 주기"));
  fireEvent.click(await screen.findByText("매년"));

  await waitFor(() =>
    expect(screen.getByLabelText("임대료 청구 주기").closest(".ant-select")).toHaveTextContent(
      "매년",
    ),
  );

  fireEvent.mouseDown(screen.getByLabelText("납부 방식"));
  expect(await screen.findByRole("option", { name: "후불" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  fireEvent.keyDown(screen.getByLabelText("납부 방식"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(onFinish).toHaveBeenCalledWith(
    expect.objectContaining({
      billingTiming: "PREPAID",
      rentBillingCycle: "YEARLY",
    }),
  );
});

test("OCR payload에 계약 청구 조건을 포함하고 수정 payload에서는 제외한다", () => {
  const formValues: TenantInfoFormValues = {
    room: "101",
    name: "홍길동",
    phone: "010-1111-2222",
    startDate: dayjs("2026-09-01"),
    paymentDay: 25,
    billingTiming: "POSTPAID",
    rentBillingCycle: "MONTHLY",
    rentManwon: 50,
  };

  expect(toTenantValues(formValues)).toEqual(
    expect.objectContaining({
      paymentDay: 25,
      billingTiming: "POSTPAID",
      rentBillingCycle: "MONTHLY",
    }),
  );
  expect(toUpdateTenantRequest(formValues)).toEqual(
    expect.objectContaining({ paymentDay: 25 }),
  );
  expect(toUpdateTenantRequest(formValues)).not.toHaveProperty("billingTiming");
  expect(toUpdateTenantRequest(formValues)).not.toHaveProperty("rentBillingCycle");

  const legacyValues = {
    ...toTenantValues(formValues),
    billingTiming: undefined,
    rentBillingCycle: undefined,
  };
  expect(fromTenantValues(legacyValues).billingTiming).toBe("PREPAID");
  expect(fromTenantValues(legacyValues).rentBillingCycle).toBe("MONTHLY");
});

test("일반 수정에서는 납부 방식과 임대료 청구 주기 선택을 비활성화한다", () => {
  render(
    <TestForm
      onFinish={jest.fn()}
      billingTimingEditable={false}
      rentBillingCycleEditable={false}
    />,
  );

  expect(screen.getByLabelText("납부 방식")).toBeDisabled();
  expect(screen.getByLabelText("임대료 청구 주기")).toBeDisabled();
});

test("등록된 연세 계약은 시작일을 수정할 수 없다", () => {
  render(
    <TestForm
      onFinish={jest.fn()}
      billingTimingEditable={false}
      rentBillingCycleEditable={false}
      initialRentBillingCycle="YEARLY"
    />,
  );

  expect(screen.getByLabelText("계약 시작일")).toBeDisabled();
  expect(screen.getByText("연세 계약의 시작일은 등록 후 수정할 수 없습니다.")).toBeInTheDocument();
});

test("납부일 입력에 1~31 범위와 도움말을 제공한다", () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);

  expect(screen.getByLabelText("납부일")).toHaveAttribute("aria-valuemin", "1");
  expect(screen.getByLabelText("납부일")).toHaveAttribute("aria-valuemax", "31");
  expect(screen.getByText("1~31 사이의 날짜를 입력하세요.")).toBeInTheDocument();
});
