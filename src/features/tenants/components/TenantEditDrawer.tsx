"use client";

import { EntityCell } from "@/components/EntityCell";
import styles from "./TenantEditDrawer.module.css";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Drawer, Form, Modal } from "antd";

import { useUnsavedChanges } from "@/components/NavigationGuard";
import { parseProblemDetail } from "@/lib/api/problem";
import { useCorrectTenantContractType, useUpdateTenant } from "../hooks";
import { tenantBillingFieldErrors } from "../billingValidation";
import { useContractOverlapConfirmation } from "../useContractOverlapConfirmation";
import type { CorrectableContractType, TenantDetail } from "../types";
import {
  TenantInfoFormFields,
  type TenantInfoFormValues,
  fromTenantDetail,
  isTenantFormComplete,
  toTenantValues,
  toUpdateTenantRequest,
} from "./TenantInfoForm";

type Props = { tenant: TenantDetail; open: boolean; onClose: () => void; queryError?: ReactNode };

function ContractTypeCorrectionModal({ tenant, from, onCancel, onSuccess }: {
  tenant: TenantDetail; from: CorrectableContractType; onCancel: () => void; onSuccess: () => void;
}) {
  const correction = useCorrectTenantContractType(tenant);
  const submitting = useRef(false);
  const target = from === "ROOM" ? "COMMERCIAL" : "ROOM";
  const sourceLabel = from === "ROOM" ? "세대" : "상가";
  const targetLabel = target === "COMMERCIAL" ? "상가" : "세대";
  const problem = parseProblemDetail(correction.error);

  function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    correction.mutate(target, { onSuccess, onSettled: () => { submitting.current = false; } });
  }

  return <Modal
    open title={`계약 유형을 ${targetLabel}로 정정할까요?`}
    okText={`${targetLabel}로 정정`} onOk={confirm} confirmLoading={correction.isPending}
    cancelText="취소" onCancel={() => { if (!submitting.current) onCancel(); }}
    cancelButtonProps={{ disabled: correction.isPending }}
    closable={!correction.isPending} keyboard={!correction.isPending} mask={{ closable: false }}
  >
    <p>{tenant.name} · 호실 {tenant.roomNumber} · 임차인 #{tenant.tenantId}</p>
    <p>현재 유형은 {sourceLabel}입니다. 정정하면 이전 달의 계약을 조회할 때도 {targetLabel}로 표시됩니다.</p>
    {correction.isError && <Alert type="error" showIcon
      title={problem?.title ?? "계약 유형 정정 실패"} description={problem?.detail ?? "잠시 후 다시 시도해 주세요."} />}
  </Modal>;
}

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
  const [correctionFrom, setCorrectionFrom] = useState<CorrectableContractType | null>(null);
  if (session.identity !== identity) {
    setSession({ identity, tenant });
    setCorrectionFrom(null);
  }
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
  const busy = isSubmitting || isPending || correctionFrom !== null;
  const currentType = tenant.contractType;

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
    if (!open || correctionFrom !== null) return;
    try {
      if (!await submit(toUpdateTenantRequest(values), update, "수정")) return;
      notification.success({ title: "임차인 정보가 수정됐습니다." });
      clearUnsavedChanges();
      onClose();
    } catch (err) {
      form.setFields(tenantBillingFieldErrors(err));
      const p = parseProblemDetail(err);
      notification.error({ title: p?.title ?? "수정 실패", description: p?.detail });
    }
  }

  return (
    <Drawer title="임차인 정보 수정" open={open} onClose={handleClose} size="min(480px, 100vw)" closable={!busy} keyboard={!busy} mask={{ closable: !busy }}>
      <div className={styles.context}>
        <EntityCell primary={tenant.name} secondary={`호실 ${tenant.roomNumber} · ${tenant.phone}`} meta={`수정 대상 · 임차인 #${tenant.tenantId}`} />
        {(currentType === "ROOM" || currentType === "COMMERCIAL") && <div>
          <Button disabled={busy || isDirty} onClick={() => {
            if (hasUnsavedInput()) {
              notification.info({ title: "작성 중인 임차인 정보를 먼저 저장하거나 취소해 주세요." });
              return;
            }
            setCorrectionFrom(currentType);
          }}>계약 유형 정정</Button>
          {isDirty && <div className="admin-detail-meta">작성 중인 임차인 정보를 먼저 저장하거나 취소해 주세요.</div>}
        </div>}
      </div>
      {queryError}
      <div ref={formRoot}><Form
        form={form}
        layout="vertical"
        initialValues={fromTenantDetail(tenant)}
        onFinish={handleFinish}
        scrollToFirstError={{ focus: true }}
        disabled={busy}
      >
        <TenantInfoFormFields
          form={form}
          billingTimingEditable={false}
          rentChargeFrequencyEditable={false}
        />
        <div className={styles.actions}><Button onClick={handleClose} disabled={busy}>취소</Button><Button type="primary" htmlType="submit" loading={isSubmitting || isPending} disabled={!isDirty || !isTenantFormComplete(watched) || busy} block>
          수정
        </Button></div>
      </Form></div>
      {open && correctionFrom && <ContractTypeCorrectionModal tenant={tenant} from={correctionFrom}
        onCancel={() => setCorrectionFrom(null)}
        onSuccess={() => {
          notification.success({ title: "계약 유형을 정정했습니다." });
          setCorrectionFrom(null);
          onClose();
        }}
      />}
    </Drawer>
  );
}
