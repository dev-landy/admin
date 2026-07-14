"use client";

import { App, Button, DatePicker, Drawer, Form, Input, InputNumber } from "antd";
import dayjs from "dayjs";

import { parseProblemDetail } from "@/lib/api/problem";
import { manwonToWon, wonToManwon } from "@/lib/format/currency";
import { useUpdateTenant } from "../hooks";
import type { TenantDetail, UpdateTenantRequest } from "../types";

type Props = { tenant: TenantDetail; open: boolean; onClose: () => void };

export function TenantEditDrawer({ tenant, open, onClose }: Props) {
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateTenant(tenant.tenantId);
  const [form] = Form.useForm<UpdateTenantRequest & { endDate?: dayjs.Dayjs; startDate?: dayjs.Dayjs }>();

  function handleFinish(values: Record<string, unknown>) {
    const body: UpdateTenantRequest = {
      name: values.name as string | undefined,
      roomNumber: values.roomNumber as number | undefined,
      phone: values.phone as string | undefined,
      rentPrice:
        values.rentPrice === undefined ? undefined : manwonToWon(values.rentPrice as number),
      depositAmount:
        values.depositAmount === undefined
          ? undefined
          : manwonToWon(values.depositAmount as number),
      paymentDay: values.paymentDay as number | undefined,
      startDate: values.startDate ? (values.startDate as dayjs.Dayjs).format("YYYY-MM-DD") : undefined,
      endDate: values.endDate ? (values.endDate as dayjs.Dayjs).format("YYYY-MM-DD") : undefined,
    };
    update(body, {
      onSuccess: () => {
        notification.success({ message: "수정되었습니다." });
        onClose();
      },
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ message: p?.title ?? "수정 실패", description: p?.detail });
      },
    });
  }

  return (
    <Drawer title="임차인 정보 수정" open={open} onClose={onClose} width={480}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...tenant,
          rentPrice: wonToManwon(tenant.rentPrice),
          depositAmount: wonToManwon(tenant.depositAmount),
          startDate: tenant.startDate ? dayjs(tenant.startDate) : undefined,
          endDate: tenant.endDate ? dayjs(tenant.endDate) : undefined,
        }}
        onFinish={handleFinish}
      >
        <Form.Item label="이름" name="name"><Input /></Form.Item>
        <Form.Item label="호실" name="roomNumber"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="전화번호" name="phone"><Input placeholder="010-0000-0000" /></Form.Item>
        <Form.Item label="월세 (만원)" name="rentPrice"><InputNumber min={0.0001} addonAfter="만원" style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="보증금 (만원)" name="depositAmount"><InputNumber min={0} addonAfter="만원" style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="납부일" name="paymentDay"><InputNumber min={1} max={31} style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="계약 시작일" name="startDate"><DatePicker style={{ width: "100%" }} /></Form.Item>
        <Form.Item label="계약 종료일" name="endDate"><DatePicker style={{ width: "100%" }} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending} block>저장</Button>
      </Form>
    </Drawer>
  );
}
