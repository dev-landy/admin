"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "@/components/NavigationGuard";
import { App, Checkbox, Form, Input, Modal } from "antd";
import type { ModalProps } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { PropertyIdentity } from "./PropertyIdentity";
import { useUpdateProperty } from "../hooks";
import type { PropertySummary, UpdatePropertyRequest, UserPropertySummary } from "../types";

type EditableProperty = PropertySummary | UserPropertySummary;
type Props = {
  property: EditableProperty | null;
  onClose: () => void;
  afterClose?: () => void;
  focusable?: ModalProps["focusable"];
};

function editSession(property: EditableProperty | null, generation: number) {
  return {
    open: property !== null,
    propertyId: property?.propertyId,
    generation,
    initialValues: property ? { name: property.name, address: property.address, clearAddress: false } : undefined,
  };
}

export function PropertyEditModal(props: Props) {
  const [session, setSession] = useState(() => editSession(props.property, 0));
  if (props.property && (!session.open || session.propertyId !== props.property.propertyId)) {
    setSession(editSession(props.property, session.generation + 1));
  } else if (!props.property && session.open) {
    setSession({ ...session, open: false });
  }
  // Keep the closing dialog mounted. Only a new editing session replaces the
  // Form instance, so a previous draft cannot become another record's values.
  return <PropertyEditSession key={session.generation} {...props} initialValues={session.initialValues} />;
}

function PropertyEditSession({ property, onClose, afterClose, focusable, initialValues }: Props & { initialValues?: UpdatePropertyRequest }) {
  const [form] = Form.useForm<UpdatePropertyRequest>();
  const { notification, modal } = App.useApp();
  const { mutate: update, isPending } = useUpdateProperty();
  const closeConfirmation = useRef<{ destroy: () => void } | null>(null);
  useEffect(() => () => { closeConfirmation.current?.destroy(); }, [property?.propertyId]);
  const clearAddress = Form.useWatch("clearAddress", form);

  const hasUnsavedInput = useCallback(() => {
    if (!property || !initialValues || !form.isFieldsTouched()) return false;
    const values = form.getFieldsValue();
    return values.name?.trim() !== initialValues.name.trim() || Boolean(values.clearAddress) || (values.address?.trim() || null) !== (initialValues.address?.trim() || null);
  }, [form, property, initialValues]);
  const clearUnsavedChanges = useUnsavedChanges(false, hasUnsavedInput);

  function handleClose() {
    if (isPending) return;
    if (!hasUnsavedInput()) { onClose(); return; }
    closeConfirmation.current?.destroy();
    closeConfirmation.current = modal.confirm({
      title: "수정 중인 내용을 버릴까요?",
      content: "저장하지 않은 건물 정보가 사라집니다.",
      okText: "변경 내용 버리기", cancelText: "계속 수정", okButtonProps: { danger: true },
      onOk: () => { clearUnsavedChanges(); onClose(); },
    });
  }

  function maxCodePoints(_rule: unknown, value?: string | null) {
    return Array.from(value ?? "").length > 255
      ? Promise.reject(new Error("255자 이하로 입력해 주세요."))
      : Promise.resolve();
  }

  function handleSubmit(values: UpdatePropertyRequest) {
    if (!property || isPending) return;
    update(
      { propertyId: property.propertyId, body: values.clearAddress
        ? { name: values.name.trim(), clearAddress: true }
        : { name: values.name.trim(), address: values.address?.trim() || null } },
      {
        onSuccess: () => {
          notification.success({ title: "건물 정보가 수정되었습니다." });
          clearUnsavedChanges();
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({ title: problem?.title ?? "수정 실패", description: problem?.detail });
        },
      },
    );
  }

  return (
    <Modal
      title={`건물 수정${property ? ` · ${property.name}` : ""}`}
      open={property !== null}
      okText="저장"
      cancelText="취소"
      confirmLoading={isPending}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      mask={{ closable: !isPending }}
      keyboard={!isPending}
      onCancel={handleClose}
      afterClose={afterClose}
      focusable={focusable}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {property && <div className="admin-context-panel" style={{ marginBottom: 20 }}><PropertyIdentity property={property} /></div>}
      <Form form={form} initialValues={initialValues} layout="vertical" onFinish={handleSubmit} scrollToFirstError={{ focus: true }} preserve={false} disabled={isPending}>
        <Form.Item label="건물명" name="name" rules={[{ required: true, whitespace: true, message: "건물명을 입력하세요." }, { validator: maxCodePoints }]}>
          <Input />
        </Form.Item>
        <Form.Item label="주소" name="address" dependencies={["clearAddress"]}
          rules={[{ validator: (rule, value) => clearAddress ? Promise.resolve() : maxCodePoints(rule, value) }]}
          extra="주소를 비워 두면 기존 주소를 유지합니다. 지우려면 주소 삭제를 선택해 주세요.">
          <Input disabled={isPending || clearAddress} placeholder="주소 없음" />
        </Form.Item>
        <Form.Item name="clearAddress" valuePropName="checked">
          <Checkbox>주소 삭제</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
