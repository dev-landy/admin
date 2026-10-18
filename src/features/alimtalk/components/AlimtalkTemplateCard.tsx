"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Descriptions, Form, Input, Switch, Tag } from "antd";

import { useAdminViewport } from "@/components/useAdminViewport";
import { RowActions } from "@/components/RowActions";
import { parseProblemDetail } from "@/lib/api/problem";
import { useUnsavedChanges } from "@/components/NavigationGuard";
import { formatSeconds } from "@/lib/format/date";
import { useSyncAlimtalkTemplate, useUpdateAlimtalkTemplate } from "../hooks";
import { ALIMTALK_TYPE_PRESENTATION } from "../presentation";
import type { AlimtalkTemplate } from "../types";
import { ApprovedAlimtalkDetails } from "./ApprovedAlimtalkDetails";
import styles from "./AlimtalkTemplateCard.module.css";

type FormValues = { pfId: string; templateId: string; enabled: boolean };

function toFormValues(template: AlimtalkTemplate): FormValues {
  return { pfId: template.pfId ?? "", templateId: template.templateId ?? "", enabled: template.enabled };
}

/** ID와 발송 여부만 편집하고, 발송·미리보기에 쓰는 승인 정보는 서버가 가져온다. */
export function AlimtalkTemplateCard({ template }: { template: AlimtalkTemplate }) {
  const { notification } = App.useApp();
  const viewport = useAdminViewport();
  const operationInProgress = useRef(false);
  const [operation, setOperation] = useState<"save" | "sync" | null>(null);
  const [savedOverride, setSavedOverride] = useState<{ source: AlimtalkTemplate; value: AlimtalkTemplate } | null>(null);
  const savedTemplate = savedOverride?.source === template ? savedOverride.value : template;
  const [syncError, setSyncError] = useState<unknown>(null);
  const [form] = Form.useForm<FormValues>();
  const hasDraftChanges = useRef(false);
  const savedValues = useRef(toFormValues(template));
  const draftPfId = Form.useWatch("pfId", form);
  const draftTemplateId = Form.useWatch("templateId", form);
  const { mutate: update, isPending } = useUpdateAlimtalkTemplate();
  const { mutate: sync, isPending: isSyncPending } = useSyncAlimtalkTemplate();
  const busy = operation !== null || isPending || isSyncPending;
  const presentation = ALIMTALK_TYPE_PRESENTATION[template.type];
  const idsChanged = (draftPfId !== undefined && draftPfId !== (savedTemplate.pfId ?? ""))
    || (draftTemplateId !== undefined && draftTemplateId !== (savedTemplate.templateId ?? ""));
  const syncDisabled = busy || idsChanged || !savedTemplate.pfId || !savedTemplate.templateId;

  // 백그라운드 재조회는 승인 표시를 갱신하되 편집 중인 ID·사용 여부를 덮어쓰지 않는다.
  useEffect(() => {
    savedValues.current = toFormValues(template);
    if (hasDraftChanges.current) return;
    form.setFieldsValue(savedValues.current);
  }, [form, template]);

  const hasUnsavedInput = useCallback(() => {
    const draft = { ...savedValues.current, ...form.getFieldsValue(true) };
    return Object.entries(savedValues.current).some(([key, value]) => draft[key as keyof FormValues] !== value);
  }, [form]);
  useUnsavedChanges(false, hasUnsavedInput);

  function finish() { operationInProgress.current = false; setOperation(null); }

  function handleSync() {
    // ID 저장 자체가 승인 정보를 가져오므로 입력 중인 ID의 중복 갱신을 막는다.
    const draft = form.getFieldsValue(true);
    if (busy || operationInProgress.current || draft.pfId !== (savedTemplate.pfId ?? "")
      || draft.templateId !== (savedTemplate.templateId ?? "") || !savedTemplate.pfId || !savedTemplate.templateId) return;
    operationInProgress.current = true;
    setOperation("sync");
    setSyncError(null);
    sync(template.type, {
      onSuccess: (saved) => {
        savedValues.current = toFormValues(saved);
        if (!hasDraftChanges.current) form.setFieldsValue(savedValues.current);
        setSavedOverride({ source: template, value: saved });
        finish();
        notification.success({ title: `${presentation.label} 승인 정보를 갱신했습니다.` });
      },
      onError: (error) => { setSyncError(error); finish(); },
    });
  }

  function handleSave() {
    if (busy || operationInProgress.current) return;
    operationInProgress.current = true;
    setOperation("save");
    form.validateFields().then((values) => {
      update({ type: template.type, body: { pfId: values.pfId, templateId: values.templateId, enabled: values.enabled } }, {
        onSuccess: (saved) => {
          hasDraftChanges.current = false;
          savedValues.current = toFormValues(saved);
          form.setFieldsValue(savedValues.current);
          setSavedOverride({ source: template, value: saved });
          setSyncError(null);
          finish();
          notification.success({ title: `${presentation.label} 템플릿을 저장했습니다.` });
        },
        onError: (error) => {
          finish();
          const problem = parseProblemDetail(error);
          notification.error({ title: problem?.title ?? "저장 실패", description: problem?.detail });
        },
      });
    }).catch(finish);
  }

  const syncButton = <Button loading={operation === "sync"} disabled={syncDisabled} onClick={handleSync}>승인 정보 갱신</Button>;
  return (
    <Card className={`admin-operation-card ${styles.templateCard}`}
      classNames={{ header: styles.header, title: styles.title, extra: styles.extra }}
      title={<div className={styles.headerIdentity}>
        <h3 className={styles.heading}>{presentation.label}</h3>
        <div className={styles.metadata}><span className={styles.typeCode}>{template.type}</span>
          <Tag color={savedTemplate.sendable ? "green" : "warning"}>{savedTemplate.sendable ? "발송 가능" : "발송 불가"}</Tag>
        </div>
      </div>}
      extra={<div className={`admin-cell-stack ${styles.headerActions}`}>
        <RowActions subject={presentation.label}
          primary={viewport === "mobile" ? null : <Button type="primary" loading={operation === "save"} disabled={busy} onClick={handleSave}>저장</Button>}
          disabled={busy}
          items={[{ key: "sync", label: "승인 정보 갱신", disabled: syncDisabled, onClick: handleSync }]} />
      </div>}
    >
      {!savedTemplate.sendable && <Alert className={styles.recoveryAlert} classNames={{ actions: styles.alertActions }}
        type="warning" showIcon style={{ marginBottom: 16 }} title="이 종류는 지금 발송되지 않습니다"
        description={<><span>발송 사용을 켜고, 저장된 ID와 일치하는 승인 정보를 준비해야 합니다. ID를 저장하면 승인 정보를 함께 가져옵니다.</span>
          {viewport === "mobile" && <div className={styles.warningRecovery}>{syncButton}</div>}</>}
        action={viewport === "mobile" ? undefined : syncButton} />}
      {idsChanged && <Alert type="info" showIcon style={{ marginBottom: 16 }} title="ID 변경 사항을 먼저 저장하세요"
        description="저장할 때 새 ID의 승인 정보를 함께 가져옵니다. 입력 중인 ID로는 승인 정보를 갱신하지 않습니다." />}
      {syncError != null && <Alert type="error" showIcon style={{ marginBottom: 16 }} title="승인 정보를 갱신하지 못했습니다."
        description={parseProblemDetail(syncError)?.detail ?? "마지막으로 저장한 승인 정보를 표시하고 있습니다. 다시 갱신해 주세요."}
        action={<Button disabled={syncDisabled} onClick={handleSync}>다시 갱신</Button>} />}
      <Form name={`alimtalk-template-${template.type}`} form={form} layout="vertical" disabled={busy}
        onValuesChange={() => { hasDraftChanges.current = hasUnsavedInput(); }}>
        <Form.Item label="발송 사용" name="enabled" valuePropName="checked">
          <Switch aria-label={`${presentation.label} 발송 사용`} checkedChildren="사용" unCheckedChildren="중지" />
        </Form.Item>
        <Form.Item label="채널 ID (pfId)" name="pfId" rules={[{ max: 64, message: "64자를 넘을 수 없습니다." }]}><Input placeholder="KA01PF..." /></Form.Item>
        <Form.Item label="템플릿 ID" name="templateId" rules={[{ max: 64, message: "64자를 넘을 수 없습니다." }]}><Input placeholder="KA01TP..." /></Form.Item>
      </Form>
      <Card size="small" type="inner" title="저장된 승인 템플릿" style={{ marginTop: 16, marginBottom: 16 }}>
        {savedTemplate.syncRequired && <Alert type="warning" showIcon title="승인 정보 갱신이 필요합니다" style={{ marginBottom: 12 }} />}
        <ApprovedAlimtalkDetails template={savedTemplate} />
      </Card>
      <Descriptions column={1} size="small" items={[{ key: "updatedAt", label: "수정일", children: formatSeconds(savedTemplate.updatedAt) }]} />
      {viewport === "mobile" && <div className={styles.saveBar}><Button type="primary" block aria-label={`${presentation.label} 변경 사항 저장`} loading={operation === "save"} disabled={busy} onClick={handleSave}>저장</Button></div>}
    </Card>
  );
}
