"use client";

import { type Ref, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Space, Tag, Typography } from "antd";
import type { RefSelectProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { useUserProperties } from "@/features/properties/hooks";
import { parseProblemDetail } from "@/lib/api/problem";
import type { ContractPropertyValues, RegisterContractDocumentRequest } from "../types";
import styles from "./ContractDocumentReview.module.css";
import { useUnsavedChanges } from "@/components/NavigationGuard";

const { Text } = Typography;
const NEW_PROPERTY = "new-property";
export type ContractPropertySelection =
  | { kind: "existing"; propertyId: number; propertyUpdate?: ContractPropertyValues }
  | { kind: "new"; newProperty: ContractPropertyValues };

export function toContractPropertyRequest(selection: ContractPropertySelection, originalPropertyId: number): Pick<RegisterContractDocumentRequest, "propertyId" | "propertyUpdate" | "newProperty"> {
  if (selection.kind === "new") return { newProperty: selection.newProperty };
  if (selection.propertyUpdate) return { propertyId: selection.propertyId, propertyUpdate: selection.propertyUpdate };
  return selection.propertyId === originalPropertyId ? {} : { propertyId: selection.propertyId };
}

function maxCodePoints(label: string) {
  return (_rule: unknown, value?: string | null) => Array.from(value ?? "").length > 255
    ? Promise.reject(new Error(`${label} 입력은 255자 이하로 입력해 주세요.`)) : Promise.resolve();
}

function PropertyDraftForm({ initialValues, onFinish, disabled, submitRef }: {
  initialValues: ContractPropertyValues;
  onFinish: (values: ContractPropertyValues) => void;
  disabled: boolean;
  submitRef: Ref<{ submit: () => void }>;
}) {
  const [form] = Form.useForm<ContractPropertyValues>();
  const formId = useId();
  const hasUnsavedInput = useCallback(() => {
    const values = form.getFieldsValue(true);
    return (values.name ?? "") !== (initialValues.name ?? "") || (values.address ?? "") !== (initialValues.address ?? "");
  }, [form, initialValues]);
  useUnsavedChanges(false, hasUnsavedInput);
  useImperativeHandle(submitRef, () => ({ submit: () => form.submit() }), [form]);
  return <Form name={`contract-property-${formId}`} form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish} preserve={false} disabled={disabled} style={{ width: "100%" }}>
    <Form.Item label="건물명" name="name" rules={[{ required: true, whitespace: true, message: "건물명을 입력해 주세요." }, { validator: maxCodePoints("건물명") }]}>
      <Input aria-label="건물명" placeholder="예: 랜디빌라" />
    </Form.Item>
    <Form.Item label="주소 (선택)" name="address" rules={[{ validator: maxCodePoints("주소") }]}>
      <Input aria-label="주소 (선택)" placeholder="계약서에 기재된 주소" />
    </Form.Item>
  </Form>;
}

export function ContractDocumentPropertyField({ userId, value, onChange, onAvailabilityChange, onDirtyChange, disabled }: {
  userId: number;
  value: ContractPropertySelection;
  onChange: (value: ContractPropertySelection) => void;
  onAvailabilityChange: (available: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  disabled: boolean;
}) {
  const query = useUserProperties(userId);
  const properties = query.data?.properties ?? [];
  const original = value.kind === "existing" ? properties.find((property) => property.propertyId === value.propertyId) : undefined;
  const building = value.kind === "new" ? value.newProperty : value.propertyUpdate ?? original;
  const available = query.isSuccess && (value.kind === "new" || !!original);
  const [drafts, setDrafts] = useState<Partial<Record<number, ContractPropertyValues>>>({});
  const [newDraft, setNewDraft] = useState<ContractPropertyValues>();
  const lastExistingId = useRef(value.kind === "existing" ? value.propertyId : undefined);
  const [modal, setModal] = useState<"edit" | "new">();
  const [menuOpen, setMenuOpen] = useState(false);
  const propertyFormRef = useRef<{ submit: () => void }>(null);
  const selectRef = useRef<RefSelectProps>(null);
  const addButtonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const selectId = useId();
  const pending = value.kind === "new" || !!value.propertyUpdate;

  useEffect(() => { onAvailabilityChange(available); }, [available, onAvailabilityChange]);
  useEffect(() => { onDirtyChange?.(!!newDraft || Object.values(drafts).some(Boolean)); }, [newDraft, drafts, onDirtyChange]);

  function selectBuilding(selected: number | typeof NEW_PROPERTY) {
    if (disabled) return;
    if (selected === NEW_PROPERTY && newDraft) onChange({ kind: "new", newProperty: newDraft });
    else if (typeof selected === "number" && properties.some((property) => property.propertyId === selected)) {
      lastExistingId.current = selected;
      onChange({ kind: "existing", propertyId: selected, propertyUpdate: drafts[selected] });
    }
    setMenuOpen(false);
  }

  function applyBuilding(values: ContractPropertyValues) {
    if (disabled) return;
    const next = { name: values.name.trim(), address: values.address?.trim() || null };
    if (modal === "new" || value.kind === "new") {
      setNewDraft(next);
      onChange({ kind: "new", newProperty: next });
    } else {
      const draft = original?.name === next.name && original.address === next.address ? undefined : next;
      setDrafts((previous) => ({ ...previous, [value.propertyId]: draft }));
      onChange({ kind: "existing", propertyId: value.propertyId, propertyUpdate: draft });
    }
    setModal(undefined);
  }

  function undoBuilding() {
    if (disabled) return;
    if (value.kind === "new") {
      setNewDraft(undefined);
      if (lastExistingId.current !== undefined) onChange({ kind: "existing", propertyId: lastExistingId.current, propertyUpdate: drafts[lastExistingId.current] });
    } else {
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[value.propertyId];
        return next;
      });
      onChange({ kind: "existing", propertyId: value.propertyId });
    }
  }

  return <>
    <div className={styles.buildingRow} onKeyDownCapture={(event) => {
      if (event.key === "Tab" && !event.shiftKey && menuOpen && addButtonRef.current
        && event.target instanceof HTMLElement && event.target.getAttribute("role") === "combobox") {
        event.preventDefault();
        event.stopPropagation();
        addButtonRef.current.focus();
      }
    }}>
      <label className={styles.buildingLabel} htmlFor={selectId}>건물<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
      <Select<number | typeof NEW_PROPERTY> ref={selectRef} id={selectId} aria-label="등록할 건물" aria-required="true"
        className={styles.buildingSelect} placeholder="건물을 선택해 주세요."
        value={value.kind === "new" ? NEW_PROPERTY : original ? value.propertyId : undefined}
        loading={query.isPending} disabled={disabled || query.isPending || query.isError}
        open={menuOpen} onOpenChange={setMenuOpen} onChange={selectBuilding}
        options={[
          ...properties.map((property) => ({ value: property.propertyId, label: drafts[property.propertyId]?.name ?? property.name })),
          ...(newDraft ? [{ value: NEW_PROPERTY, label: `${newDraft.name} (추가 예정)` }] : []),
        ]}
        popupRender={(menu) => <div>{menu}<div className={styles.addBuildingMenu}>
          <Button ref={addButtonRef} type="link" block icon={<PlusOutlined />} aria-label="새 건물 추가" disabled={disabled}
            style={{ justifyContent: "flex-start" }} onMouseDown={(event) => event.preventDefault()}
            onClick={() => { setMenuOpen(false); setModal("new"); }}
            onKeyDown={(event) => { if (event.key === "Escape") { setMenuOpen(false); selectRef.current?.focus(); } }}>
            새 건물 추가
          </Button>
        </div></div>} />
      <Button disabled={disabled || !building || !available} onClick={() => setModal("edit")}>정보 수정</Button>
    </div>
    {query.isError && <Alert style={{ marginTop: 8 }} type="error" showIcon
      title={parseProblemDetail(query.error)?.detail ?? "건물 정보를 불러오지 못했습니다."}
      action={<Button size="small" loading={query.isFetching} disabled={disabled} onClick={() => { void query.refetch(); }}>건물 다시 조회</Button>} />}
    {query.isSuccess && !available && <Alert style={{ marginTop: 8 }} type="warning" showIcon title="등록할 건물을 선택하거나 새 건물을 추가해 주세요." />}
    {pending && <div className={styles.pendingBuilding}>
      <Tag color="blue" style={{ marginInlineEnd: 0 }}>{value.kind === "new" ? "추가 예정" : "수정 예정"}</Tag>
      <Text type="secondary" style={{ fontSize: 12 }}>계약 등록 시 함께 저장</Text>
      <Button type="link" size="small" disabled={disabled} onClick={undoBuilding}>되돌리기</Button>
    </div>}
    <hr className={styles.buildingDivider} />
    <Modal title={modal === "new" ? "새 건물 추가" : "건물 정보 수정"} open={!!modal} centered width={520}
      okText={modal === "new" ? "추가하고 선택" : "변경 내용 적용"} cancelText="취소"
      okButtonProps={{ disabled }} cancelButtonProps={{ disabled }} keyboard={!disabled} mask={{ closable: !disabled }}
      onOk={() => propertyFormRef.current?.submit()} onCancel={() => { if (!disabled) setModal(undefined); }} destroyOnHidden
      afterClose={() => selectRef.current?.focus()}
    >
      <Space orientation="vertical" size={20} style={{ width: "100%", marginTop: 12 }}>
        <Text type="secondary">{modal === "new" ? "이 임대인의 건물을 추가하고, 등록할 건물로 선택합니다." : "계약서 원본과 건물의 이름·주소를 대조해 주세요."}</Text>
        {modal && <PropertyDraftForm submitRef={propertyFormRef} disabled={disabled} onFinish={applyBuilding}
          initialValues={modal === "new" ? { name: "", address: "" } : { name: building?.name ?? "", address: building?.address ?? "" }} />}
        <Alert type="info" showIcon title="계약 등록을 눌렀을 때 함께 저장합니다."
          description={modal === "edit" && value.kind === "existing" ? "수정된 건물 이름과 주소는 이 건물의 다른 계약에도 표시됩니다." : "현재 입력한 임차인 정보는 그대로 유지됩니다."} />
      </Space>
    </Modal>
  </>;
}
