"use client";

import { Alert, App, Checkbox, Descriptions, Form, Input, Modal, Select } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useResolveAlimtalk } from "../hooks";
import { ALIMTALK_STATUS_PRESENTATION } from "../presentation";
import type { AlimtalkSummary, ResolveAlimtalkRequest } from "../types";

type FormValues = ResolveAlimtalkRequest & { confirmed: boolean };

export function AlimtalkResolutionModal({
  alimtalk,
  onClose,
}: {
  alimtalk: AlimtalkSummary | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const { notification } = App.useApp();
  const { mutate: resolve, isPending } = useResolveAlimtalk();
  const isReady = alimtalk?.status === "READY";

  function handleSubmit(values: FormValues) {
    if (!alimtalk || isPending) return;
    const messageId = values.messageId?.trim();
    resolve(
      {
        alimtalkId: alimtalk.alimtalkId,
        body: {
          status: isReady ? "FAILED" : values.status,
          ...(!isReady && messageId ? { messageId } : {}),
        },
      },
      {
        onSuccess: (result) => {
          notification.success({
            title: "알림톡을 종결했습니다.",
            description: `발송 ID ${result.alimtalkId} · ${ALIMTALK_STATUS_PRESENTATION[result.status].label}`,
          });
          onClose();
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({
            title: problem?.title ?? "알림톡 종결 실패",
            description: problem?.type.endsWith("alimtalk-not-pending")
              ? "상태가 변경되었거나 이미 종결된 요청입니다. 갱신된 이력을 확인하세요."
              : problem?.detail,
          });
          if (problem?.type.endsWith("alimtalk-not-pending")) onClose();
        },
      },
    );
  }

  return (
    <Modal
      title="알림톡 미결 건 종결"
      open={alimtalk !== null}
      okText="종결"
      cancelText="취소"
      onOk={() => form.submit()}
      onCancel={() => { if (!isPending) onClose(); }}
      okButtonProps={{ disabled: isPending }}
      confirmLoading={isPending}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      mask={{ closable: !isPending }}
      keyboard={!isPending}
      destroyOnHidden
    >
      {alimtalk && (
        <>
          <Alert
            type="warning"
            showIcon
            title={isReady ? "제출 전 요청을 미발송으로 종료합니다" : "공급자 콘솔에서 확인한 결과로 종결하세요"}
            description={isReady
              ? "FAILED로 종료하며 새 발송은 하지 않습니다. 종결 후에도 같은 날 재요청은 계속 차단됩니다."
              : "SENT는 공급자 접수 확인, FAILED는 미접수 확인입니다. 접수 여부를 확인할 수 없으면 UNKNOWN을 선택하세요. 새 발송은 하지 않으며, 같은 날 재요청은 계속 차단됩니다."}
            style={{ marginBottom: 16 }}
          />
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
            items={[
              { key: "id", label: "발송 ID", children: alimtalk.alimtalkId },
              { key: "recipient", label: "수신자", children: `${alimtalk.recipientType === "TENANT" ? "임차인" : "유저"} #${alimtalk.recipientId}` },
              { key: "targetDate", label: "대상일", children: alimtalk.targetDate },
              { key: "status", label: "현재 상태", children: ALIMTALK_STATUS_PRESENTATION[alimtalk.status].label },
            ]}
          />
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            scrollToFirstError={{ focus: true }}
            initialValues={{ status: isReady ? "FAILED" : undefined, messageId: alimtalk.messageId ?? undefined }}
            preserve={false}
            disabled={isPending}
          >
            <Form.Item label="종결 상태" name="status" rules={[{ required: true, message: "확인한 결과를 선택하세요." }]}>
              <Select
                disabled={isReady || isPending}
                placeholder="확인한 결과 선택"
                options={isReady ? [{ label: "FAILED · 미발송 종료", value: "FAILED" }] : [
                  { label: "SENT · 공급자 접수 확인", value: "SENT" },
                  { label: "FAILED · 미접수 확인", value: "FAILED" },
                  { label: "UNKNOWN · 접수 여부 불명", value: "UNKNOWN" },
                ]}
              />
            </Form.Item>
            {!isReady && (
              <Form.Item
                label="공급자 메시지 ID (선택)"
                name="messageId"
                getValueFromEvent={(event) => event.target.value.trim()}
                rules={[{ pattern: /^[A-Za-z0-9_-]{1,100}$/, message: "영문·숫자·밑줄·하이픈으로 100자 이내 입력하세요." }]}
              >
                <Input maxLength={100} placeholder="공급자 콘솔에서 확인한 ID" />
              </Form.Item>
            )}
            <Form.Item
              name="confirmed"
              valuePropName="checked"
              rules={[{ validator: (_rule, value) => value ? Promise.resolve() : Promise.reject(new Error("종결 내용을 확인하세요.")) }]}
            >
              <Checkbox>{isReady ? "이 요청을 발송하지 않고 종료할 것을 확인했습니다." : "공급자 확인 결과와 종결 상태를 확인했습니다."}</Checkbox>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
