"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Descriptions, Form, Input, InputNumber, Modal, Tag } from "antd";
import type { FormRule } from "antd";

import { useUnsavedChanges } from "@/components/NavigationGuard";
import { FormFieldGrid } from "@/components/FormFieldGrid";
import { parseProblemDetail } from "@/lib/api/problem";
import { CHANNEL_COLOR } from "../channel";
import { useUpdateReleasePolicy } from "../hooks";
import type { ReleasePolicy, UpdateReleasePolicyRequest } from "../types";

const MIN_BUILD_NUMBER = 1;
const STORE_URL_MESSAGE = "http 또는 https로 시작하는 URL을 입력하세요.";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// 빌드 번호 제약을 입력 아래 표시하고 같은 제약을 규칙으로도 막는다.
function buildNumberRules(requiredMessage: string): FormRule[] {
  return [
    { required: true, message: requiredMessage },
    {
      type: "integer",
      min: MIN_BUILD_NUMBER,
      message: `${MIN_BUILD_NUMBER} 이상의 정수를 입력하세요.`,
    },
  ];
}

function textRules(requiredMessage: string): FormRule[] {
  return [{ required: true, whitespace: true, message: requiredMessage }];
}

function toFormValues(policy: ReleasePolicy): UpdateReleasePolicyRequest {
  return {
    latestBuildNumber: policy.latestBuildNumber,
    latestVersion: policy.latestVersion,
    minSupportedBuildNumber: policy.minSupportedBuildNumber,
    storeUrl: policy.storeUrl,
    forceUpdateTitle: policy.forceUpdateTitle,
    forceUpdateMessage: policy.forceUpdateMessage,
    softUpdateTitle: policy.softUpdateTitle,
    softUpdateMessage: policy.softUpdateMessage,
  };
}

type Props = { policy: ReleasePolicy | null; onClose: () => void };

export function ReleasePolicyEditModal(props: Props) {
  return <ReleasePolicyEditor key={props.policy?.appReleasePolicyId ?? "closed"} {...props} />;
}

function ReleasePolicyEditor({ policy, onClose }: Props) {
  const [form] = Form.useForm<UpdateReleasePolicyRequest>();
  const { notification, modal } = App.useApp();
  const { mutate: update, isPending } = useUpdateReleasePolicy();

  const [initialValues] = useState(() => policy ? toFormValues(policy) : null);
  const watched: Partial<UpdateReleasePolicyRequest> | undefined = Form.useWatch([], form);
  const closeConfirmation = useRef<{ token: object; destroy: () => void } | null>(null);
  const currentSession = useRef(false);
  useEffect(() => {
    currentSession.current = true;
    return () => {
      currentSession.current = false;
      closeConfirmation.current?.destroy();
      closeConfirmation.current = null;
    };
  }, []);
  useEffect(() => {
    if (isPending) {
      closeConfirmation.current?.destroy();
      closeConfirmation.current = null;
    }
  }, [isPending]);

  const hasUnsavedInput = useCallback(() => {
    if (!policy || !initialValues) return false;
    const draft = { ...initialValues, ...form.getFieldsValue(true) };
    return Object.entries(initialValues).some(([key, value]) => draft[key as keyof UpdateReleasePolicyRequest] !== value);
  }, [policy, form, initialValues]);
  const isDirty = initialValues !== null && watched !== undefined && Object.entries(initialValues).some(([key, value]) => watched[key as keyof UpdateReleasePolicyRequest] !== value);
  const clearUnsavedChanges = useUnsavedChanges(policy !== null && isDirty, hasUnsavedInput);

  function handleClose() {
    if (isPending || !policy) return;
    if (!hasUnsavedInput()) {
      clearUnsavedChanges();
      onClose();
      return;
    }
    if (closeConfirmation.current) return;
    const token = {};
    const confirmation = modal.confirm({
      title: "수정 중인 내용을 버릴까요?",
      content: "저장하지 않은 릴리즈 정책 변경이 사라집니다.",
      okText: "변경 내용 버리기",
      cancelText: "계속 수정",
      okButtonProps: { danger: true },
      focusable: { autoFocusButton: "cancel" },
      mask: { closable: false },
      onOk: () => {
        if (!currentSession.current || closeConfirmation.current?.token !== token) return;
        closeConfirmation.current = null;
        clearUnsavedChanges();
        onClose();
      },
      afterClose: () => {
        if (closeConfirmation.current?.token === token) closeConfirmation.current = null;
      },
    });
    closeConfirmation.current = { token, destroy: confirmation.destroy };
  }

  function handleSubmit(values: UpdateReleasePolicyRequest) {
    if (!policy || isPending) return;
    update(
      { appReleasePolicyId: policy.appReleasePolicyId, body: values },
      {
        onSuccess: () => {
          if (!currentSession.current) return;
          closeConfirmation.current?.destroy();
          closeConfirmation.current = null;
          clearUnsavedChanges();
          // 어떤 정책을 바꿨는지까지 알린다. 플랫폼·채널이 다른 정책이 여러 개다.
          notification.success({
            title: `${policy.platform} ${policy.channel} 릴리즈 정책이 수정되었습니다.`,
          });
          onClose();
        },
        onError: (error) => {
          if (!currentSession.current) return;
          const problem = parseProblemDetail(error);
          notification.error({
            title: problem?.title ?? "릴리즈 정책 수정 실패",
            description: problem?.detail,
          });
        },
      },
    );
  }

  return (
    <Modal
      title="릴리즈 정책 수정"
      open={policy !== null}
      width={640}
      okText="저장"
      cancelText="취소"
      confirmLoading={isPending}
      onCancel={handleClose}
      okButtonProps={{ disabled: isPending }}
      cancelButtonProps={{ disabled: isPending }}
      closable={!isPending}
      mask={{ closable: !isPending }}
      keyboard={!isPending}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {policy && (
        <>
          <Alert
            type="warning"
            showIcon
            title="실제 사용자 앱의 강제·소프트 업데이트 동작을 결정하는 값입니다. 저장하면 바로 반영됩니다."
            style={{ marginBottom: 16 }}
          />
          {/* 플랫폼·채널은 정책의 식별자다. 어떤 정책을 고치는 중인지 항상 보이게 둔다. */}
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" style={{ marginBottom: 16 }} items={[
            { key: "platform", label: "플랫폼", children: policy.platform },
            { key: "channel", label: "채널", children: <Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag> },
          ]} />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={isPending}
            scrollToFirstError={{ focus: true }}
            preserve={false}
            initialValues={initialValues ?? undefined}
          >
            <Form.Item
              label="최신 버전"
              name="latestVersion"
              extra="사용자에게 보여줄 버전 문자열입니다. 예: 1.4.2"
              rules={textRules("최신 버전을 입력하세요.")}
            >
              <Input placeholder="1.4.2" />
            </Form.Item>

            <div style={{ marginBottom: 24 }}>
              <FormFieldGrid>
                  <Form.Item
                    label="최신 빌드 번호"
                    name="latestBuildNumber"
                    extra={`${MIN_BUILD_NUMBER} 이상의 정수로 입력합니다.`}
                    rules={buildNumberRules("최신 빌드 번호를 입력하세요.")}
                  >
                    <InputNumber min={MIN_BUILD_NUMBER} precision={0} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    label="최소 지원 빌드 번호"
                    name="minSupportedBuildNumber"
                    extra={`${MIN_BUILD_NUMBER} 이상, 최신 빌드 번호 이하입니다. 이 번호보다 낮은 빌드는 강제 업데이트 대상이 됩니다.`}
                    // 최신 빌드 번호가 바뀌면 이 필드 규칙을 다시 확인해야 한다.
                    dependencies={["latestBuildNumber"]}
                    rules={[
                      ...buildNumberRules("최소 지원 빌드 번호를 입력하세요."),
                      ({ getFieldValue }) => ({
                        validator: (_rule, value) => {
                          const latest: unknown = getFieldValue("latestBuildNumber");
                          if (!isNumber(value) || !isNumber(latest) || value <= latest) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error("최소 지원 빌드 번호는 최신 빌드 번호보다 클 수 없습니다."),
                          );
                        },
                      }),
                    ]}
                  >
                    <InputNumber min={MIN_BUILD_NUMBER} precision={0} style={{ width: "100%" }} />
                  </Form.Item>
              </FormFieldGrid>
            </div>

            <Form.Item
              label="스토어 URL"
              name="storeUrl"
              extra="업데이트 안내에서 열 스토어 주소입니다."
              // 형식 오류 하나에 같은 안내가 두 번 뜨지 않게 첫 실패에서 멈춘다.
              validateFirst
              rules={[
                { required: true, whitespace: true, message: "스토어 URL을 입력하세요." },
                { type: "url", message: STORE_URL_MESSAGE },
                { pattern: /^https?:\/\//i, message: STORE_URL_MESSAGE },
              ]}
            >
              <Input placeholder="https://apps.apple.com/app/id000000000" />
            </Form.Item>

            <Form.Item
              label="강제 업데이트 제목"
              name="forceUpdateTitle"
              rules={textRules("강제 업데이트 제목을 입력하세요.")}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="강제 업데이트 메시지"
              name="forceUpdateMessage"
              rules={textRules("강제 업데이트 메시지를 입력하세요.")}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item
              label="소프트 업데이트 제목"
              name="softUpdateTitle"
              rules={textRules("소프트 업데이트 제목을 입력하세요.")}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="소프트 업데이트 메시지"
              name="softUpdateMessage"
              rules={textRules("소프트 업데이트 메시지를 입력하세요.")}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
