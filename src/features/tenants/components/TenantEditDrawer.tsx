"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Drawer, Form } from "antd";

import { useUnsavedChanges } from "@/components/NavigationGuard";
import { parseProblemDetail } from "@/lib/api/problem";
import { useUpdateTenant } from "../hooks";
import { useContractOverlapConfirmation } from "../useContractOverlapConfirmation";
import type { TenantDetail } from "../types";
import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantDetail,
  toTenantValues,
  toUpdateTenantRequest,
} from "./TenantInfoForm";

type Props = { tenant: TenantDetail; open: boolean; onClose: () => void; queryError?: ReactNode };

// 계약서 검수의 "임차인 정보 수정" 화면과 같은 폼·활성화 규칙(값이 바뀌어야 수정 가능)을 쓴다.
export function TenantEditDrawer({ tenant, open, onClose, queryError }: Props) {
  const { notification, modal } = App.useApp();
  const { mutateAsync: update, isPending } = useUpdateTenant(tenant.tenantId);
  const { submit, isSubmitting } = useContractOverlapConfirmation(`${tenant.tenantId}-${open}`);
  const [form] = Form.useForm<TenantInfoFormValues>();

  const formRoot = useRef<HTMLDivElement>(null);
  const closeConfirmation = useRef<{ destroy: () => void } | null>(null);

  const identity = `${tenant.tenantId}-${open}`;
  const [session, setSession] = useState(() => ({ identity, tenant }));
  if (session.identity !== identity) setSession({ identity, tenant });
  const initialSnapshot = JSON.stringify(toTenantValues(fromTenantDetail(session.tenant)));
  useEffect(() => {
    if (open) form.setFieldsValue(fromTenantDetail(session.tenant));
  }, [open, session.tenant, form]);

  useEffect(() => () => { closeConfirmation.current?.destroy(); }, [identity]);

  const watched = Form.useWatch([], form);
  const isDirty =
    watched !== undefined && JSON.stringify(toTenantValues(watched)) !== initialSnapshot;

  const hasUnsavedInput = useCallback(() => {
    if (!open) return false;
    const values = form.getFieldsValue(true);
    if (JSON.stringify(toTenantValues(values)) !== initialSnapshot) return true;
    return (["startDate", "endDate"] as const).some((field) => {
      const input = formRoot.current?.querySelector<HTMLInputElement>(`[data-tenant-date-field="${field}"] input`);
      return input ? input.value.replaceAll("-", "").trim() !== (values[field]?.format("YYYYMMDD") ?? "") : false;
    });
  }, [open, form, initialSnapshot]);
  const clearUnsavedChanges = useUnsavedChanges(open && isDirty, hasUnsavedInput);
  const busy = isSubmitting || isPending;

  function handleClose() {
    if (busy) return;
    if (!hasUnsavedInput()) { onClose(); return; }
    closeConfirmation.current?.destroy();
    closeConfirmation.current = modal.confirm({
      title: "수정 중인 내용을 버릴까요?",
      content: "저장하지 않은 임차인 정보가 사라집니다.",
      okText: "변경 내용 버리기", cancelText: "계속 수정", okButtonProps: { danger: true },
      onOk: () => { clearUnsavedChanges(); onClose(); },
    });
  }

  async function handleFinish(values: TenantInfoFormValues) {
    if (!open) return;
    try {
      if (!await submit(toUpdateTenantRequest(values), update, "수정")) return;
      notification.success({ title: "임차인 정보가 수정됐습니다." });
      clearUnsavedChanges();
      onClose();
    } catch (err) {
      const p = parseProblemDetail(err);
      notification.error({ title: p?.title ?? "수정 실패", description: p?.detail });
    }
  }

  return (
    <Drawer title="임차인 정보 수정" open={open} onClose={handleClose} size="min(480px, 100vw)" closable={!busy} keyboard={!busy} mask={{ closable: !busy }}>
      {queryError}
      <div ref={formRoot}><Form
        form={form}
        layout="vertical"
        initialValues={fromTenantDetail(tenant)}
        onFinish={handleFinish}
        scrollToFirstError={{ focus: true }}
        disabled={isSubmitting || isPending}
      >
        <TenantInfoFormFields
          form={form}
          billingTimingEditable={false}
          rentBillingCycleEditable={false}
        />
        <div style={{ display: "flex", gap: 8 }}><Button onClick={handleClose} disabled={busy}>취소</Button><Button type="primary" htmlType="submit" loading={isSubmitting || isPending} disabled={!isDirty || isSubmitting || isPending} block>
          수정
        </Button></div>
      </Form></div>
    </Drawer>
  );
}
