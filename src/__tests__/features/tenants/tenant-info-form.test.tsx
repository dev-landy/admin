import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Button, Form } from "antd";
import dayjs from "dayjs";

import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantValues,
  isTenantFormComplete,
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
  contractTypeEditable = true,
  initialValues,
  disabled = false,
}: {
  onFinish: (values: TenantInfoFormValues) => void;
  billingTimingEditable?: boolean;
  rentBillingCycleEditable?: boolean;
  initialRentBillingCycle?: BillingCycle;
  contractTypeEditable?: boolean;
  initialValues?: TenantInfoFormValues;
  disabled?: boolean;
}) {
  const [form] = Form.useForm<TenantInfoFormValues>();

  return (
    <Form
      form={form}
      disabled={disabled}
      initialValues={{
        contractType: "ROOM",
        parkingEnabled: false,
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
        ...initialValues,
      }}
      onFinish={onFinish}
    >
      <TenantInfoFormFields
        form={form}
        contractTypeEditable={contractTypeEditable}
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
  expect(screen.getByLabelText("카테고리").closest(".ant-select")).toHaveTextContent("세대");
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

test("주차 이용을 체크하면 차량번호를 선택 입력하고 해제하면 번호를 제거한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);

  expect(screen.queryByLabelText("차량 번호 (선택)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "주차 이용" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
    contractType: "ROOM", parkingEnabled: true, vehicleNumber: null,
  });

  fireEvent.change(screen.getByLabelText("차량 번호 (선택)"), { target: { value: "12가3456" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "주차 이용" }));
  await waitFor(() => expect(screen.queryByLabelText("차량 번호 (선택)")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("checkbox", { name: "주차 이용" }));
  expect(await screen.findByLabelText("차량 번호 (선택)")).toHaveValue("");
});

test.each([
  ["상가", "호실"],
  ["기타", "공간 이름"],
])("%s는 %s 필드의 한글 입력을 그대로 등록한다", async (category, fieldLabel) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  fireEvent.mouseDown(screen.getByLabelText("카테고리"));
  fireEvent.click(await screen.findByText(category));
  await waitFor(() => expect(screen.queryByRole("checkbox", { name: "지하" })).not.toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: "B동 1층 상가" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  const values = toTenantValues(onFinish.mock.calls[0][0]);
  expect(values).toMatchObject({
    contractType: category === "상가" ? "COMMERCIAL" : "OTHERS",
    roomNumber: "B동 1층 상가",
  });
  expect(fromTenantValues(values)).toMatchObject({ room: "B동 1층 상가", basement: false });
});

test.each(["", "12가3456"])("주차 계약은 상단 차량 번호 %s를 제출하고 하단 주차 이용을 숨긴다", async (vehicleNumber) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  fireEvent.mouseDown(screen.getByLabelText("카테고리"));
  fireEvent.click(await screen.findByText("주차"));

  await waitFor(() => expect(screen.queryByLabelText("호실")).not.toBeInTheDocument());
  expect(screen.queryByRole("checkbox", { name: "주차 이용" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("차량 번호 (선택)")).not.toBeInTheDocument();
  expect(screen.getByLabelText("차량 번호")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("차량 번호"), { target: { value: vehicleNumber } });
  expect(screen.getByLabelText("주차비")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  const formValues = onFinish.mock.calls[0][0];
  expect(isTenantFormComplete(formValues)).toBe(true);
  expect(toTenantValues(formValues)).toMatchObject({
    contractType: "PARKING", roomNumber: null, parkingEnabled: true, vehicleNumber: vehicleNumber || null,
  });

  fireEvent.mouseDown(screen.getByLabelText("카테고리"));
  fireEvent.click(await screen.findByText("세대"));
  expect(await screen.findByLabelText("호실")).toHaveValue("");
  expect(screen.getByRole("checkbox", { name: "주차 이용" })).not.toBeChecked();
  expect(screen.queryByLabelText("차량 번호")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "주차 이용" }));
  expect(await screen.findByLabelText("차량 번호 (선택)")).toHaveValue("");
});

test("등록된 계약은 유형을 잠그고 차량번호를 비우면 PATCH에 삭제 의도를 보낸다", async () => {
  const onFinish = jest.fn();
  render(<TestForm
    onFinish={onFinish}
    contractTypeEditable={false}
    initialValues={{ contractType: "PARKING", room: undefined, parkingEnabled: true, vehicleNumber: "12가3456" }}
  />);
  expect(screen.getByLabelText("카테고리")).toBeDisabled();
  expect(screen.queryByRole("checkbox", { name: "주차 이용" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("차량 번호")).toHaveValue("12가3456");
  fireEvent.change(screen.getByLabelText("차량 번호"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  const payload = toUpdateTenantRequest(onFinish.mock.calls[0][0]);
  expect(payload).toMatchObject({ parkingEnabled: true, clearVehicleNumber: true });
  expect(payload.vehicleNumber).toBeUndefined();
  expect(payload.roomNumber).toBeUndefined();
  expect(payload).not.toHaveProperty("contractType");
});

test("계약 시작일을 선택하면 비어 있는 납부일에 같은 날짜를 기본 입력한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialValues={{ startDate: null, paymentDay: null }} />);
  const startInput = screen.getByLabelText("계약 시작일");
  fireEvent.change(startInput, { target: { value: "2026-10-17" } });
  fireEvent.blur(startInput);

  await waitFor(() => expect(screen.getByLabelText("납부일")).toHaveValue("17"));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
    startDate: "2026-10-17", paymentDay: 17,
  });
});

test("시작일을 바꾸면 기존 납부일은 유지하고 기간 칩은 새 시작일을 기준으로 계산한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  const startInput = screen.getByLabelText("계약 시작일");
  fireEvent.change(startInput, { target: { value: "2026-10-17" } });
  fireEvent.blur(startInput);
  await waitFor(() => expect(screen.getByRole("button", { name: "6개월" })).toHaveAttribute(
    "title", "2027-04-16까지",
  ));
  fireEvent.click(screen.getByRole("button", { name: "6개월" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
    startDate: "2026-10-17", paymentDay: 25, endDate: "2027-04-16",
  });
});

test.each([
  ["2년", "2026-05-17", "2028-05-16"],
  ["1년", "2026-05-17", "2027-05-16"],
  ["6개월", "2026-05-17", "2026-11-16"],
  ["6개월", "2026-08-31", "2027-02-28"],
  ["1년", "2028-02-29", "2029-02-28"],
  ["2년", "2026-03-01", "2028-02-29"],
])("%s 칩은 %s 시작 계약의 종료일을 %s로 입력한다", async (label, start, end) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialValues={{ startDate: dayjs(start) }} />);
  fireEvent.click(screen.getByRole("button", { name: label }));

  await waitFor(() => {
    expect(screen.getByLabelText("계약 종료일")).toHaveValue(end);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });
  expect(onFinish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0]).endDate).toBe(end);
});

test("시작일이 없거나 폼이 비활성화되어 있으면 기간 칩을 누를 수 없다", () => {
  const { unmount } = render(<TestForm onFinish={jest.fn()} initialValues={{ startDate: null }} />);
  for (const label of ["2년", "1년", "6개월"]) {
    expect(screen.getByRole("button", { name: label })).toBeDisabled();
  }
  unmount();
  render(<TestForm onFinish={jest.fn()} disabled />);
  for (const label of ["2년", "1년", "6개월"]) {
    expect(screen.getByRole("button", { name: label })).toBeDisabled();
  }
  expect(screen.getByLabelText("계약 시작일")).toBeDisabled();
});
