"use client";

import { App, Checkbox, Form, Input, Modal } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useUpdateProperty } from "../hooks";
import type { PropertySummary, UpdatePropertyRequest, UserPropertySummary } from "../types";

type EditableProperty = PropertySummary | UserPropertySummary;

export function PropertyEditModal({
  property,
  onClose,
}: {
  property: EditableProperty | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<UpdatePropertyRequest>();
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateProperty();
  const clearAddress = Form.useWatch("clearAddress", form);

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
      title="건물 수정"
      open={property !== null}
      okText="저장"
      cancelText="취소"
      confirmLoading={isPending}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      mask={{ closable: !isPending }}
      keyboard={!isPending}
      onCancel={() => { if (!isPending) onClose(); }}
      onOk={() => form.submit()}
      afterOpenChange={(open) => {
        if (open && property) form.setFieldsValue({ name: property.name, address: property.address, clearAddress: false });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false} disabled={isPending}>
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
