import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Button, Form } from "antd";
import dayjs from "dayjs";

import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
} from "@/features/tenants/components/TenantInfoForm";

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

function TestForm({ onFinish }: { onFinish: (values: TenantInfoFormValues) => void }) {
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
        rentManwon: 50,
        maintenanceFeeManwon: 5,
        depositManwon: 1_000,
      }}
      onFinish={onFinish}
    >
      <TenantInfoFormFields form={form} />
      <Button htmlType="submit">저장</Button>
    </Form>
  );
}

test("Space.Compact 단위 입력이 Form.Item 값 바인딩을 유지한다", async () => {
  const onFinish = jest.fn();
  render(<TestForm onFinish={onFinish} />);

  expect(screen.getByLabelText("호실")).toHaveValue("101");
  expect(screen.getByLabelText("납부일 (1~31)")).toHaveValue("25");

  fireEvent.change(screen.getByLabelText("호실"), { target: { value: "202" } });
  fireEvent.change(screen.getByLabelText("납부일 (1~31)"), { target: { value: "15" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));

  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(onFinish).toHaveBeenCalledWith(
    expect.objectContaining({
      room: "202",
      paymentDay: 15,
    }),
  );
});
