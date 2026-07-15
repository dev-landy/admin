"use client";

import { App, Form, Input, Modal } from "antd";

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

  function handleSubmit(values: UpdatePropertyRequest) {
    if (!property) return;
    update(
      { propertyId: property.propertyId, body: { ...values, address: values.address || null } },
      {
        onSuccess: () => {
          notification.success({ message: "건물 정보가 수정되었습니다." });
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({ message: problem?.title ?? "수정 실패", description: problem?.detail });
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
      onCancel={onClose}
      onOk={() => form.submit()}
      afterOpenChange={(open) => {
        if (open && property) form.setFieldsValue({ name: property.name, address: property.address });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
        <Form.Item label="건물명" name="name" rules={[{ required: true, whitespace: true, message: "건물명을 입력하세요." }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item label="주소" name="address">
          <Input maxLength={255} placeholder="주소 없음" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
