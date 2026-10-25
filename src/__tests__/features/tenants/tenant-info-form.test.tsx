import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Button, Form } from "antd";
import type { FormInstance } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";

import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantValues,
  isTenantFormComplete,
  toTenantValues,
  toUpdateTenantRequest,
} from "@/features/tenants/components/TenantInfoForm";
import type { RentChargeFrequency } from "@/features/tenants/types";

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
  rentChargeFrequencyEditable = true,
  initialRentChargeFrequency = "MONTHLY",
  contractTypeEditable = true,
  initialValues,
  appliedValues,
  onValuesChange,
  onFormReady,
  disabled = false,
}: {
  onFinish: (values: TenantInfoFormValues) => void;
  billingTimingEditable?: boolean;
  rentChargeFrequencyEditable?: boolean;
  initialRentChargeFrequency?: RentChargeFrequency;
  contractTypeEditable?: boolean;
  initialValues?: TenantInfoFormValues;
  appliedValues?: TenantInfoFormValues;
  onValuesChange?: (changed: TenantInfoFormValues, values: TenantInfoFormValues) => void;
  onFormReady?: (form: FormInstance<TenantInfoFormValues>) => void;
  disabled?: boolean;
}) {
  const [form] = Form.useForm<TenantInfoFormValues>();
  useEffect(() => onFormReady?.(form), [form, onFormReady]);

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
        rentChargeFrequency: initialRentChargeFrequency,
        rentManwon: 50,
        maintenanceFeeManwon: 5,
        depositManwon: 1_000,
        ...initialValues,
      }}
      onFinish={onFinish}
      onValuesChange={onValuesChange}
    >
      <TenantInfoFormFields
        form={form}
        contractTypeEditable={contractTypeEditable}
        billingTimingEditable={billingTimingEditable}
        rentChargeFrequencyEditable={rentChargeFrequencyEditable}
      />
      {appliedValues && (
        <Button onClick={() => form.setFieldsValue(appliedValues)}>서버 값 적용</Button>
      )}
      <Button htmlType="submit">저장</Button>
    </Form>
  );
}

const EXACT_MONEY_VALUES = fromTenantValues({
  name: "홍길동", roomNumber: "101", phone: "010-1111-2222",
  rentPrice: 500_001, maintenanceFee: 12_345, depositAmount: 1_234_567,
  paymentDay: 25, startDate: "2026-09-01", endDate: null,
});

test("일시납은 종료일이 없으면 등록할 수 없고 매월로 바꾸면 종료일은 선택값이다", async () => {
  const onFinish = jest.fn();
  const onFormReady = jest.fn();
  render(<TestForm onFinish={onFinish} onFormReady={onFormReady} initialRentChargeFrequency="ONE_TIME" />);
  const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(await screen.findByText("계약기간 일시납은 계약 종료일이 필요합니다.")).toBeInTheDocument();
  expect(isTenantFormComplete(form.getFieldsValue())).toBe(false);
  expect(onFinish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "매월" }));
  await screen.findByLabelText("월 임대료");
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(isTenantFormComplete(form.getFieldsValue())).toBe(true);
});

test("일시납 기간을 8개월에서 13개월로 바꿔도 입력 총액을 환산하지 않는다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialRentChargeFrequency="ONE_TIME" initialValues={{
    startDate: dayjs("2026-03-20"), endDate: dayjs("2026-11-19"), rentManwon: 800.0001,
  }} />);
  const end = screen.getByLabelText("계약 종료일");
  fireEvent.change(end, { target: { value: "2027-04-19" } });
  fireEvent.blur(end);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
    rentChargeFrequency: "ONE_TIME", startDate: "2026-03-20", endDate: "2027-04-19", rentPrice: 8_000_001,
  });
});

test("등록된 일시납의 종료일을 지워도 필수 검증을 우회할 수 없다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialRentChargeFrequency="ONE_TIME" rentChargeFrequencyEditable={false}
    initialValues={{ endDate: dayjs("2027-04-19") }} />);
  const end = screen.getByLabelText("계약 종료일");
  fireEvent.change(end, { target: { value: "" } });
  fireEvent.blur(end);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(await screen.findByText("계약기간 일시납은 계약 종료일이 필요합니다.")).toBeInTheDocument();
  expect(onFinish).not.toHaveBeenCalled();
});

async function commitDateEvent(action: () => void) {
  await act(async () => {
    action();
    // useWatch는 MessageChannel로 알림을 배치한다. 같은 macro task까지 기다려 상태를 flush한다.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

test("만원을 기본 표시하고 단위만 바꾸면 입력값과 실제 금액을 유지한다", async () => {
  const onFinish = jest.fn();
  const onValuesChange = jest.fn();
  render(<TestForm onFinish={onFinish} onValuesChange={onValuesChange} initialValues={EXACT_MONEY_VALUES} />);

  for (const [label, manwon, won] of [
      ["월 임대료", "50.0001", "500001"],
      ["월 관리비", "1.2345", "12345"],
      ["보증금", "123.4567", "1234567"],
    ]) {
      expect(screen.getByLabelText(label)).toHaveValue(manwon);
      fireEvent.click(screen.getByRole("button", { name: `${label} 만원 단위, 원으로 전환` }));
      expect(screen.getByLabelText(label)).toHaveValue(won);
    }
    expect(onValuesChange).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
      rentPrice: 500_001, maintenanceFee: 12_345, depositAmount: 1_234_567,
    });
    expect(toTenantValues(onFinish.mock.calls[0][0])).toEqual(toTenantValues(EXACT_MONEY_VALUES));
  });

  test("금액별로 원 단위를 입력하고 만원으로 돌아와도 1원 정밀도로 등록·수정한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} />);

    for (const [label, won, manwon] of [
      ["월 임대료", "501234", "50.1234"],
      ["월 관리비", "56789", "5.6789"],
      ["보증금", "10000001", "1000.0001"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: `${label} 만원 단위, 원으로 전환` }));
      fireEvent.change(screen.getByLabelText(label), { target: { value: won } });
      fireEvent.blur(screen.getByLabelText(label));
      fireEvent.click(screen.getByRole("button", { name: `${label} 원 단위, 만원으로 전환` }));
      expect(screen.getByLabelText(label)).toHaveValue(manwon);
    }
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    const formValues = onFinish.mock.calls[0][0];
    const money = { rentPrice: 501_234, maintenanceFee: 56_789, depositAmount: 10_000_001 };
    expect(toTenantValues(formValues)).toMatchObject(money);
    expect(toUpdateTenantRequest(formValues)).toMatchObject(money);
    expect(toTenantValues(fromTenantValues(toTenantValues(formValues)))).toMatchObject(money);
  });

  test("만원 입력 중 소수점을 유지하고 원 단위 입력은 정수 원으로 제출한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} />);
    const rent = screen.getByLabelText("월 임대료");
    fireEvent.focus(rent);
    for (const value of ["1", "1.", "1.2", "1.23", "1.2345"]) {
      fireEvent.change(rent, { target: { value } });
      expect(rent).toHaveValue(value);
    }
    fireEvent.blur(rent);
    fireEvent.click(screen.getByRole("button", { name: "월 임대료 만원 단위, 원으로 전환" }));
    expect(rent).toHaveValue("12345");
    fireEvent.change(rent, { target: { value: "12345.6" } });
    fireEvent.blur(rent);
    expect(rent).toHaveValue("12346");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0]).rentPrice).toBe(12_346);
  });

  test("원 단위 전환은 다른 금액에 영향을 주지 않고 초안·OCR·저장된 서버값을 현재 단위로 표시한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} appliedValues={EXACT_MONEY_VALUES} />);
    fireEvent.click(screen.getByRole("button", { name: "월 임대료 만원 단위, 원으로 전환" }));
    expect(screen.getByLabelText("월 임대료")).toHaveValue("500000");
    expect(screen.getByRole("button", { name: "월 관리비 만원 단위, 원으로 전환" })).toBeInTheDocument();
    expect(screen.getByLabelText("월 관리비")).toHaveValue("5");

    fireEvent.click(screen.getByRole("button", { name: "서버 값 적용" }));
    await waitFor(() => expect(screen.getByLabelText("월 임대료")).toHaveValue("500001"));
    expect(screen.getByLabelText("월 관리비")).toHaveValue("1.2345");
    expect(screen.getByLabelText("보증금")).toHaveValue("123.4567");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toEqual(toTenantValues(EXACT_MONEY_VALUES));
  });

  test("원 단위 필드를 비우면 0원을 제출하고 비활성화 폼에서는 단위를 전환할 수 없다", async () => {
    const onFinish = jest.fn();
    const { unmount } = render(<TestForm onFinish={onFinish} />);
    for (const label of ["월 임대료", "월 관리비", "보증금"]) {
      fireEvent.click(screen.getByRole("button", { name: `${label} 만원 단위, 원으로 전환` }));
      fireEvent.change(screen.getByLabelText(label), { target: { value: "" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
      rentPrice: 0, maintenanceFee: 0, depositAmount: 0,
    });
    unmount();

    render(<TestForm onFinish={jest.fn()} disabled />);
    for (const label of ["월 임대료", "월 관리비", "보증금"]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
      expect(screen.getByRole("button", { name: `${label} 만원 단위, 원으로 전환` })).toBeDisabled();
    }
  });

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

  test("기간 일시납을 선택하면 선불로 맞추고 후불 선택을 차단한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} initialValues={{ endDate: dayjs("2027-04-30") }} />);

    fireEvent.mouseDown(screen.getByLabelText("납부 방식"));
    fireEvent.click(await screen.findByText("후불"));
    fireEvent.click(screen.getByRole("radio", { name: "계약기간 일시납" }));
    expect(screen.getByRole("radio", { name: "계약기간 일시납" })).toBeChecked();
    await screen.findByLabelText("계약기간 임대료 총액");

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
        rentChargeFrequency: "ONE_TIME",
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
      rentChargeFrequency: "MONTHLY",
      rentManwon: 50,
    };

    expect(toTenantValues(formValues)).toEqual(
      expect.objectContaining({
        paymentDay: 25,
        billingTiming: "POSTPAID",
        rentChargeFrequency: "MONTHLY",
      }),
    );
    expect(toUpdateTenantRequest(formValues)).toEqual(
      expect.objectContaining({ paymentDay: 25 }),
    );
    expect(toUpdateTenantRequest(formValues)).not.toHaveProperty("billingTiming");
    expect(toUpdateTenantRequest(formValues)).not.toHaveProperty("rentChargeFrequency");

    const incompleteDraftValues = {
      ...toTenantValues(formValues),
      billingTiming: undefined,
      rentChargeFrequency: undefined,
    };
    expect(fromTenantValues(incompleteDraftValues).billingTiming).toBe("PREPAID");
    expect(fromTenantValues(incompleteDraftValues).rentChargeFrequency).toBe("MONTHLY");
  });

  test("일반 수정에서는 납부 방식과 임대료 납부 유형 선택을 비활성화한다", () => {
    render(
      <TestForm
        onFinish={jest.fn()}
        billingTimingEditable={false}
        rentChargeFrequencyEditable={false}
      />,
    );

    expect(screen.getByLabelText("납부 방식")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "매월" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "계약기간 일시납" })).toBeDisabled();
  });

  test("등록된 기간 일시납 계약은 시작일을 수정할 수 없다", () => {
    render(
      <TestForm
        onFinish={jest.fn()}
        billingTimingEditable={false}
        rentChargeFrequencyEditable={false}
        initialRentChargeFrequency="ONE_TIME"
      />,
    );

    expect(screen.getByLabelText("계약 시작일")).toBeDisabled();
    expect(screen.getByText("계약기간 일시납의 시작일은 등록 후 수정할 수 없습니다.")).toBeInTheDocument();
    const descriptionIds = screen.getByLabelText("계약 시작일").getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    expect(descriptionIds.some((id) => document.getElementById(id)?.textContent?.includes("계약기간 일시납의 시작일은 등록 후 수정할 수 없습니다."))).toBe(true);
  });

  test("납부일 범위 밖 값은 저장하지 않고 31일 경계는 허용한다", async () => {
    const onFinish = jest.fn();
    const onFormReady = jest.fn();
    render(<TestForm onFinish={onFinish} onFormReady={onFormReady} />);
    const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
    for (const paymentDay of [0, 32]) {
      await commitDateEvent(() => form.setFieldValue("paymentDay", paymentDay));
      fireEvent.click(screen.getByRole("button", { name: "저장" }));
      expect(await screen.findByText("1~31 사이의 날짜만 가능합니다.")).toBeInTheDocument();
      expect(onFinish).not.toHaveBeenCalled();
    }
    await commitDateEvent(() => form.setFieldValue("paymentDay", 31));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0]).paymentDay).toBe(31);
  });

  test("비어 있거나 0인 임대료는 선택 입력이며 등록·수정에서 0원으로 정규화한다", async () => {
    const onFinish = jest.fn();
    const onFormReady = jest.fn();
    render(<TestForm onFinish={onFinish} onFormReady={onFormReady} initialValues={{ rentManwon: undefined }} />);
    const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
    for (const rentManwon of [undefined, null, 0]) {
      onFinish.mockClear();
      await commitDateEvent(() => form.setFieldValue("rentManwon", rentManwon));
      expect(screen.getByLabelText("월 임대료")).not.toHaveAttribute("aria-required", "true");
      fireEvent.click(screen.getByRole("button", { name: "저장" }));

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      const values = onFinish.mock.calls[0][0];
      expect(isTenantFormComplete(values)).toBe(true);
      expect(toTenantValues(values).rentPrice).toBe(0);
      expect(toUpdateTenantRequest(values).rentPrice).toBe(0);
    }
  });

  test("선택 입력인 임대료에도 음수는 허용하지 않는다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} initialValues={{ rentManwon: -1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("임대료는 0 이상이어야 합니다.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
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

  test("상가와 기타 계약은 공간 이름의 한글을 그대로 등록한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} />);
    for (const [category, fieldLabel] of [
    ["상가", "호실"],
    ["기타", "공간 이름"],
  ]) {
    onFinish.mockClear();
    fireEvent.mouseDown(screen.getByLabelText("카테고리"));
    fireEvent.click(await screen.findByText(category));
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "지하" })).not.toBeInTheDocument());
    const spaceName = await screen.findByLabelText(fieldLabel);
    fireEvent.change(spaceName, { target: { value: "B동 1층 상가" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    const values = toTenantValues(onFinish.mock.calls[0][0]);
    expect(values).toMatchObject({
      contractType: category === "상가" ? "COMMERCIAL" : "OTHERS",
      roomNumber: "B동 1층 상가",
    });
    expect(fromTenantValues(values)).toMatchObject({ room: "B동 1층 상가", basement: false });
  }
});

test("주차 계약의 선택 차량번호를 저장하고 세대 전환에서 초기화한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  for (const vehicleNumber of ["", "12가3456"]) {
    onFinish.mockClear();
    fireEvent.mouseDown(screen.getByLabelText("카테고리"));
    fireEvent.click(await screen.findByText("주차"));

    await waitFor(() => expect(screen.queryByLabelText("호실")).not.toBeInTheDocument());
    expect(screen.queryByRole("checkbox", { name: "주차 이용" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("차량 번호 (선택)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("차량 번호")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("차량 번호"), { target: { value: vehicleNumber } });
    expect(screen.getByLabelText("월 주차비")).toBeInTheDocument();
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
  }
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

test.each(["Enter", "blur"] as const)("숫자 8자리 시작일·종료일을 %s로 확정하면 표준 날짜와 Dayjs 폼값으로 유지한다", async (commit) => {
  const onFinish = jest.fn();
  const onValuesChange = jest.fn();
  render(<TestForm onFinish={onFinish} onValuesChange={onValuesChange} initialValues={{ startDate: null, endDate: null, paymentDay: null }} />);
  for (const [label, inputValue, displayValue] of [
      ["계약 시작일", "20261001", "2026-10-01"],
      ["계약 종료일", "20280930", "2028-09-30"],
    ]) {
      const input = screen.getByLabelText(label);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: inputValue } });
      if (commit === "Enter") {
        // jsdom은 implicit form submit을 재현하지 않으므로 브라우저 기본 동작의 취소까지 검증한다.
        expect(fireEvent.keyDown(input, { key: "Enter", code: "Enter" })).toBe(false);
      } else fireEvent.blur(input);
      await waitFor(() => expect(input).toHaveValue(displayValue));
    }
    await waitFor(() => expect(screen.getByLabelText("납부일")).toHaveValue("1"));
    // 입력 표시가 먼저 갱신될 수 있으므로 종료일의 public onChange가 실제 Form 값까지 확정한 뒤 제출한다.
    await waitFor(() => {
      const formValues = onValuesChange.mock.calls.at(-1)?.[1];
      expect(formValues).toBeDefined();
      expect(dayjs.isDayjs(formValues?.startDate)).toBe(true);
      expect(dayjs.isDayjs(formValues?.endDate)).toBe(true);
      expect(toTenantValues(formValues)).toMatchObject({ startDate: "2026-10-01", endDate: "2028-09-30", paymentDay: 1 });
    });
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    const values = onFinish.mock.calls[0][0];
    expect(dayjs.isDayjs(values.startDate)).toBe(true);
    expect(dayjs.isDayjs(values.endDate)).toBe(true);
    expect(toTenantValues(values)).toMatchObject({ startDate: "2026-10-01", endDate: "2028-09-30", paymentDay: 1 });
  });

  test.each(["20260230", "202610"])("날짜 입력 %s에서 Enter를 눌러도 폼 기본 제출을 막고 기존 날짜를 유지한다", async (text) => {
    const onFinish = jest.fn();
    const onValuesChange = jest.fn();
    render(<TestForm onFinish={onFinish} onValuesChange={onValuesChange} />);
    const input = screen.getByLabelText("계약 시작일");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    expect(fireEvent.keyDown(input, { key: "Enter", code: "Enter" })).toBe(false);
    fireEvent.blur(input);
    await waitFor(() => expect(input).toHaveValue("2026-09-01"));
    expect(onValuesChange).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  test("존재하지 않는 날짜와 범위 밖 입력은 양쪽 날짜를 바꾸지 않고 기존 계약으로 저장한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} initialValues={{ endDate: dayjs("2027-08-31") }} />);
    for (const text of ["20260230", "20260229", "20260431", "20261301", "2026-02-30"]) {
      onFinish.mockClear();
      for (const label of ["계약 시작일", "계약 종료일"]) {
        const input = screen.getByLabelText(label);
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: text } });
        fireEvent.blur(input);
      }
      await waitFor(() => {
        expect(screen.getByLabelText("계약 시작일")).toHaveValue("2026-09-01");
        expect(screen.getByLabelText("계약 종료일")).toHaveValue("2027-08-31");
      });
      fireEvent.click(screen.getByRole("button", { name: "저장" }));
      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({ startDate: "2026-09-01", endDate: "2027-08-31" });
    }
  });

  test("부분 날짜는 적용하지 않고 윤년 숫자 날짜를 입력하면 기존 기간 칩으로 종료일을 계산한다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} initialValues={{ startDate: null, paymentDay: null }} />);
    const startInput = screen.getByLabelText("계약 시작일");
    fireEvent.focus(startInput);
    fireEvent.change(startInput, { target: { value: "202802" } });
    fireEvent.blur(startInput);
    await waitFor(() => expect(startInput).toHaveValue(""));
    expect(screen.getByRole("button", { name: "1년" })).toBeDisabled();
    fireEvent.focus(startInput);
    fireEvent.change(startInput, { target: { value: "20280229" } });
    fireEvent.keyDown(startInput, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(startInput).toHaveValue("2028-02-29"));
    await waitFor(() => expect(screen.getByRole("button", { name: "1년" })).toHaveAttribute("title", "2029-02-28까지"));
    fireEvent.click(screen.getByRole("button", { name: "1년" }));
    await waitFor(() => expect(screen.getByLabelText("계약 종료일")).toHaveValue("2029-02-28"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({ startDate: "2028-02-29", endDate: "2029-02-28", paymentDay: 29 });
  });

  test("숫자 종료일도 시작일보다 빠르면 기존 계약 기간 검증을 유지한다", async () => {
    const onFinish = jest.fn();
    const onValuesChange = jest.fn();
    render(<TestForm onFinish={onFinish} onValuesChange={onValuesChange} />);
    const endInput = screen.getByLabelText("계약 종료일");
    fireEvent.change(endInput, { target: { value: "20260831" } });
    fireEvent.blur(endInput);
    await waitFor(() => expect(onValuesChange).toHaveBeenCalledWith(
      { endDate: expect.anything() }, expect.objectContaining({ endDate: expect.anything() }),
    ));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("종료일은 시작일보다 빠를 수 없습니다.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  test("달력 선택과 종료일 지우기는 숫자 날짜 입력 지원 이후에도 Dayjs와 null을 저장한다", async () => {
    const onFinish = jest.fn();
    const onValuesChange = jest.fn();
    render(<TestForm onFinish={onFinish} onValuesChange={onValuesChange} initialValues={{ endDate: dayjs("2027-08-31") }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "날짜 선택" })[0]);
    fireEvent.click(await screen.findByTitle("2026-09-20"));
    await waitFor(() => expect(onValuesChange).toHaveBeenCalledWith(
      { startDate: expect.anything() }, expect.objectContaining({ startDate: expect.anything() }),
    ));
    expect(screen.getByLabelText("계약 시작일")).toHaveValue("2026-09-20");
    const endPicker = screen.getByLabelText("계약 종료일").closest(".ant-picker");
    expect(endPicker).not.toBeNull();
    fireEvent.click(within(endPicker as HTMLElement).getByRole("button"));
    await waitFor(() => expect(screen.getByLabelText("계약 종료일")).toHaveValue(""));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    const values = onFinish.mock.calls[0][0];
    expect(dayjs.isDayjs(values.startDate)).toBe(true);
    expect(values.endDate).toBeNull();
    expect(toTenantValues(values)).toMatchObject({ startDate: "2026-09-20", endDate: null });
  });

  test("필수 시작일을 지우면 기간 칩을 비활성화하고 저장을 막는다", async () => {
    const onFinish = jest.fn();
    render(<TestForm onFinish={onFinish} />);
    const startPicker = screen.getByLabelText("계약 시작일").closest(".ant-picker");
    expect(startPicker).not.toBeNull();
    await commitDateEvent(() => {
      fireEvent.click(within(startPicker as HTMLElement).getByRole("button"));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "1년" })).toBeDisabled());
    expect(screen.getByLabelText("계약 시작일")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("계약 시작일을 선택해 주세요.")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  test("날짜 필수·오류 설명과 실제 DatePicker ref를 Form에서 입력으로 전달한다", async () => {
    const onFinish = jest.fn();
    const onFormReady = jest.fn();
    render(<TestForm onFinish={onFinish} onFormReady={onFormReady} initialValues={{ startDate: null }} />);
    const input = screen.getByLabelText("계약 시작일");
    expect(input).toHaveAttribute("aria-required", "true");

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const error = await screen.findByText("계약 시작일을 선택해 주세요.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const descriptionIds = input.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    expect(descriptionIds.some((id) => document.getElementById(id)?.contains(error))).toBe(true);
    expect(onFinish).not.toHaveBeenCalled();

    const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
    expect(form.getFieldInstance("startDate").nativeElement).toContainElement(input);
    await commitDateEvent(() => form.focusField("startDate"));
    expect(input).toHaveFocus();
  });

  test("시작일 값 적용 직후 기간 칩을 눌러도 최신 날짜로 종료일을 계산한다", async () => {
    const onFinish = jest.fn();
    const onFormReady = jest.fn();
    render(<TestForm onFinish={onFinish} onFormReady={onFormReady} appliedValues={{ startDate: dayjs("2026-10-17") }} />);
    const startInput = screen.getByLabelText("계약 시작일");
    const chip = screen.getByRole("button", { name: "6개월" });
    const applyValues = screen.getByRole("button", { name: "서버 값 적용" });
    const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
    // Form의 최신 값과 useWatch의 이전 미리보기를 같은 이벤트에서 명시적으로 재현한다.
    await commitDateEvent(() => {
      fireEvent.click(applyValues);
      expect(form.getFieldValue("startDate").format("YYYY-MM-DD")).toBe("2026-10-17");
      expect(chip).toHaveAttribute("title", "2027-02-28까지");
      fireEvent.click(chip);
    });
    expect(startInput).toHaveValue("2026-10-17");
    expect(screen.getByLabelText("계약 종료일")).toHaveValue("2027-04-16");
    expect(chip).toHaveAttribute("title", "2027-10-16까지");
    expect(chip).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
      startDate: "2026-10-17", paymentDay: 25, endDate: "2027-04-16",
    });
  });

  test("시작일이 제거된 직후 이전 기간 칩을 눌러도 저장된 종료일을 바꾸지 않는다", async () => {
    render(<TestForm onFinish={jest.fn()} initialValues={{ endDate: dayjs("2029-12-31") }} appliedValues={{ startDate: null }} />);
    const chip = screen.getByRole("button", { name: "1년" });
    const applyValues = screen.getByRole("button", { name: "서버 값 적용" });
    await commitDateEvent(() => {
      fireEvent.click(applyValues);
      fireEvent.click(chip);
    });
    expect(screen.getByLabelText("계약 시작일")).toHaveValue("");
    expect(screen.getByLabelText("계약 종료일")).toHaveValue("2029-12-31");
    expect(chip).toBeDisabled();
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
    await commitDateEvent(() => {
      fireEvent.change(startInput, { target: { value: "2026-10-17" } });
      fireEvent.blur(startInput);
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "6개월" })).toHaveAttribute(
      "title", "2027-04-16까지",
    ));
    await commitDateEvent(() => {
      fireEvent.click(screen.getByRole("button", { name: "6개월" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
      startDate: "2026-10-17", paymentDay: 25, endDate: "2027-04-16",
    });
  });

  test("기간 칩은 여섯 일반·말일·윤년 경계에서 시작일 포함 종료일을 저장한다", async () => {
    const onFinish = jest.fn();
    const onFormReady = jest.fn();
    render(<TestForm onFinish={onFinish} onFormReady={onFormReady} />);
    const form: FormInstance<TenantInfoFormValues> = onFormReady.mock.calls[0][0];
    for (const [label, start, end] of [
    ["2년", "2026-05-17", "2028-05-16"],
    ["1년", "2026-05-17", "2027-05-16"],
    ["6개월", "2026-05-17", "2026-11-16"],
    ["6개월", "2026-08-31", "2027-02-28"],
    ["1년", "2028-02-29", "2029-02-28"],
    ["2년", "2026-03-01", "2028-02-29"],
  ]) {
    onFinish.mockClear();
    await commitDateEvent(() => form.setFieldsValue({ startDate: dayjs(start), endDate: null }));
    // rc-form의 useWatch 알림은 macro task로 배치되므로 기간 선택 상태까지 flush한다.
    await commitDateEvent(() => {
      fireEvent.click(screen.getByRole("button", { name: label }));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("계약 종료일")).toHaveValue(end);
      expect(screen.getByRole("button", { name: label })).toBeEnabled();
    });
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(toTenantValues(onFinish.mock.calls[0][0]).endDate).toBe(end);
  }
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

test.each(["A동 101", "B동 1층", "BA501", "0202"])("세대 호실 %s의 문자열과 선행 0을 등록·수정·재편집에서 유지한다", async (room) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  const input = screen.getByLabelText("호실");
  expect(input).not.toHaveAttribute("inputmode", "numeric");
  expect(input).toHaveAttribute("maxlength", "255");
  fireEvent.change(input, { target: { value: room } });
  expect(input).toHaveValue(room);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  const values = onFinish.mock.calls[0][0];
  expect(toTenantValues(values).roomNumber).toBe(room);
  expect(toUpdateTenantRequest(values).roomNumber).toBe(room);
  expect(fromTenantValues(toTenantValues(values))).toMatchObject({ room, basement: false });
});

test("숫자 지하 호실은 B 접두사를 유지하고 일반 B 이름은 지하로 오인하지 않는다", async () => {
  const onFinish = jest.fn();
  const values = fromTenantValues({ ...toTenantValues({ room: "101", basement: true }), contractType: "ROOM" });
  expect(values).toMatchObject({ room: "101", basement: true });
  render(<TestForm onFinish={onFinish} initialValues={{ room: values.room, basement: values.basement }} />);
  expect(screen.getByRole("checkbox", { name: "지하" })).toBeChecked();
  expect(screen.getByLabelText("호실")).toHaveAttribute("maxlength", "254");
  fireEvent.change(screen.getByLabelText("호실"), { target: { value: "창고 A" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0]).roomNumber).toBe("B창고 A");
  expect(toTenantValues(fromTenantValues(toTenantValues(onFinish.mock.calls[0][0]))).roomNumber).toBe("B창고 A");
});

test("255자 호실에 지하 접두사를 추가하면 서버 호실 길이를 넘겨 저장하지 않는다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialValues={{ room: "가".repeat(255) }} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "지하" }));
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(await screen.findByText("호실은 254자 이내로 입력해 주세요.")).toBeInTheDocument();
  expect(onFinish).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("호실"), { target: { value: "가".repeat(254) } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0]).roomNumber).toHaveLength(255);
});

test("달력과 금액 단위 버튼은 Tab 순서에서 빠지고 클릭으로 계속 사용할 수 있다", async () => {
  render(<TestForm onFinish={jest.fn()} />);
  for (const button of screen.getAllByRole("button", { name: "날짜 선택" })) {
    expect(button).toHaveAttribute("tabindex", "-1");
  }
  for (const label of ["월 임대료", "월 관리비", "보증금"]) {
    const button = screen.getByRole("button", { name: `${label} 만원 단위, 원으로 전환` });
    expect(button).toHaveAttribute("tabindex", "-1");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: `${label} 원 단위, 만원으로 전환` })).toHaveAttribute("tabindex", "-1");
  }
  expect(screen.getByLabelText("계약 시작일")).not.toHaveAttribute("tabindex", "-1");
  expect(screen.getByLabelText("계약 종료일")).not.toHaveAttribute("tabindex", "-1");
  expect(screen.getByLabelText("월 임대료")).not.toHaveAttribute("tabindex", "-1");
  fireEvent.click(screen.getAllByRole("button", { name: "날짜 선택" })[0]);
  expect(await screen.findByTitle("2026-09-20")).toBeInTheDocument();
});

test("날짜 지우기 버튼은 값이 처음 있거나 입력 후 생겨도 Tab 순서에서 제외하고 클릭은 유지한다", async () => {
  const onValuesChange = jest.fn();
  render(<TestForm onFinish={jest.fn()} onValuesChange={onValuesChange} initialValues={{ endDate: null }} />);
  const startPicker = screen.getByLabelText("계약 시작일").closest(".ant-picker") as HTMLElement;
  const endInput = screen.getByLabelText("계약 종료일");
  const endPicker = endInput.closest(".ant-picker") as HTMLElement;
  expect(within(startPicker).getByRole("button")).toHaveAttribute("tabindex", "-1");
  expect(within(endPicker).queryByRole("button")).not.toBeInTheDocument();
  await commitDateEvent(() => {
    fireEvent.change(endInput, { target: { value: "20281105" } });
    fireEvent.keyDown(endInput, { key: "Tab", code: "Tab" });
  });
  expect(endInput).toHaveValue("2028-11-05");
  expect(within(endPicker).getByRole("button")).toHaveAttribute("tabindex", "-1");
  fireEvent.click(within(endPicker).getByRole("button"));
  await waitFor(() => expect(endInput).toHaveValue(""));
  expect(within(endPicker).queryByRole("button")).not.toBeInTheDocument();
  expect(onValuesChange).toHaveBeenCalledWith({ endDate: null }, expect.objectContaining({ endDate: null }));
  await commitDateEvent(() => {
    fireEvent.change(endInput, { target: { value: "20291105" } });
    fireEvent.blur(endInput);
  });
  expect(within(endPicker).getByRole("button")).toHaveAttribute("tabindex", "-1");
});

test.each(["Enter", "Tab", "blur"] as const)("축약 날짜를 %s로 확정하고 두 자리 연도를 항상 2000년대로 저장한다", async (commit) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialValues={{ startDate: null, endDate: null, paymentDay: null }} />);
  for (const [label, text, expected] of [
    ["계약 시작일", "261106", "2026-11-06"],
    ["계약 종료일", "691106", "2069-11-06"],
  ]) {
    const input = screen.getByLabelText(label);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    if (commit === "blur") fireEvent.blur(input);
    else fireEvent.keyDown(input, { key: commit, code: commit });
    await waitFor(() => expect(input).toHaveValue(expected));
  }
  expect(screen.getByLabelText("납부일")).toHaveValue("6");
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({
    startDate: "2026-11-06", endDate: "2069-11-06", paymentDay: 6,
  });
});

test("존재하지 않는 축약 날짜는 반영하지 않고 2000년과 2099년 경계를 엄격히 파싱한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);
  const input = screen.getByLabelText("계약 시작일");
  for (const text of ["260229", "260230", "261301", "26110"]) {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    fireEvent.blur(input);
    await waitFor(() => expect(input).toHaveValue("2026-09-01"));
  }
  for (const [label, text, expected] of [["계약 시작일", "000229", "2000-02-29"], ["계약 종료일", "991231", "2099-12-31"]]) {
    const dateInput = screen.getByLabelText(label);
    fireEvent.change(dateInput, { target: { value: text } });
    fireEvent.blur(dateInput);
    await waitFor(() => expect(dateInput).toHaveValue(expected));
  }
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0])).toMatchObject({ startDate: "2000-02-29", endDate: "2099-12-31" });
});

test("축약 시작일 blur 직후 기간 칩을 누르면 최신 입력 날짜에서 계산한다", async () => {
  render(<TestForm onFinish={jest.fn()} />);
  const input = screen.getByLabelText("계약 시작일");
  await commitDateEvent(() => {
    fireEvent.change(input, { target: { value: "261106" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: "2년" }));
  });
  expect(input).toHaveValue("2026-11-06");
  expect(screen.getByLabelText("계약 종료일")).toHaveValue("2028-11-05");
});

test.each([
  ["2026-11-06", ["2년", "2년", "1년", "6개월"], "2032-05-05"],
  ["2026-08-31", ["6개월", "6개월"], "2027-08-30"],
  ["2028-02-29", ["1년", "1년", "2년"], "2032-02-28"],
] as const)("기간 칩을 반복하면 %s의 월말·윤년 기준을 유지하며 누적한다", async (start, chips, expected) => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} initialValues={{ startDate: dayjs(start), endDate: null }} />);
  await commitDateEvent(() => {
    for (const label of chips) fireEvent.click(screen.getByRole("button", { name: label }));
  });
  expect(screen.getByLabelText("계약 종료일")).toHaveValue(expected);
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(toTenantValues(onFinish.mock.calls[0][0]).endDate).toBe(expected);
});

test("기존 종료일과 직접 입력한 종료일에서 연장하고 시작일이 바뀌면 새 기준으로 계산한다", async () => {
  render(<TestForm onFinish={jest.fn()} initialValues={{ startDate: dayjs("2021-11-06"), endDate: dayjs("2023-11-05") }} />);
  await commitDateEvent(() => fireEvent.click(screen.getByRole("button", { name: "2년" })));
  expect(screen.getByLabelText("계약 종료일")).toHaveValue("2025-11-05");
  await commitDateEvent(() => {
    const input = screen.getByLabelText("계약 종료일");
    fireEvent.change(input, { target: { value: "261231" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: "6개월" }));
  });
  expect(screen.getByLabelText("계약 종료일")).toHaveValue("2027-06-30");
  await commitDateEvent(() => {
    const input = screen.getByLabelText("계약 시작일");
    fireEvent.change(input, { target: { value: "280101" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: "1년" }));
  });
  expect(screen.getByLabelText("계약 종료일")).toHaveValue("2028-12-31");
});
