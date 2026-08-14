"use client";

import { useEffect } from "react";
import { App, Button, Drawer, Form } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useUpdateTenant } from "../hooks";
import type { TenantDetail } from "../types";
import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantDetail,
  toTenantValues,
} from "./TenantInfoForm";

type Props = { tenant: TenantDetail; open: boolean; onClose: () => void };

// 계약서 검수의 "임차인 정보 수정" 화면과 같은 폼·활성화 규칙(값이 바뀌어야 수정 가능)을 쓴다.
export function TenantEditDrawer({ tenant, open, onClose }: Props) {
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateTenant(tenant.tenantId);
  const [form] = Form.useForm<TenantInfoFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(fromTenantDetail(tenant));
    }
  }, [open, tenant, form]);

  const watched = Form.useWatch([], form);
  const initialSnapshot = JSON.stringify(toTenantValues(fromTenantDetail(tenant)));
  const isDirty =
    watched !== undefined && JSON.stringify(toTenantValues(watched)) !== initialSnapshot;

  function handleFinish(values: TenantInfoFormValues) {
    const next = toTenantValues(values);
    update(
      {
        name: next.name ?? undefined,
        roomNumber: next.roomNumber ?? undefined,
        phone: next.phone ?? undefined,
        rentPrice: next.rentPrice ?? undefined,
        maintenanceFee: next.maintenanceFee ?? undefined,
        depositAmount: next.depositAmount ?? undefined,
        paymentDay: next.paymentDay ?? undefined,
        startDate: next.startDate ?? undefined,
        endDate: next.endDate ?? undefined,
      },
      {
        onSuccess: () => {
          notification.success({ message: "임차인 정보가 수정됐습니다." });
          onClose();
        },
        onError: (err) => {
          const p = parseProblemDetail(err);
          notification.error({ message: p?.title ?? "수정 실패", description: p?.detail });
        },
      },
    );
  }

  return (
    <Drawer title="임차인 정보 수정" open={open} onClose={onClose} width={480}>
      <Form
        form={form}
        layout="vertical"
        initialValues={fromTenantDetail(tenant)}
        onFinish={handleFinish}
      >
        <TenantInfoFormFields form={form} />
        <Button type="primary" htmlType="submit" loading={isPending} disabled={!isDirty} block>
          수정
        </Button>
      </Form>
    </Drawer>
  );
}
