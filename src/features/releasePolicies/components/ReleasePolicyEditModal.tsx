"use client";

import { Alert, App, Descriptions, Form, Input, InputNumber, Modal, Space, Tag } from "antd";
import type { FormRule } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { CHANNEL_COLOR } from "../channel";
import { useUpdateReleasePolicy } from "../hooks";
import type { ReleasePolicy, UpdateReleasePolicyRequest } from "../types";

const MIN_BUILD_NUMBER = 1;
const STORE_URL_MESSAGE = "http 또는 https로 시작하는 URL을 입력하세요.";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// 라벨에 제약을 적어두고 같은 제약을 규칙으로도 막는다. 서버가 거절할 값을 저장 전에 보여준다.
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

export function ReleasePolicyEditModal({
  policy,
  onClose,
}: {
  policy: ReleasePolicy | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<UpdateReleasePolicyRequest>();
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateReleasePolicy();

  function handleSubmit(values: UpdateReleasePolicyRequest) {
    if (!policy) return;
    update(
      { appReleasePolicyId: policy.appReleasePolicyId, body: values },
      {
        onSuccess: () => {
          // 어떤 정책을 바꿨는지까지 알린다. 플랫폼·채널이 다른 정책이 여러 개다.
          notification.success({
            title: `${policy.platform} ${policy.channel} 릴리즈 정책이 수정되었습니다.`,
          });
          onClose();
        },
        onError: (error) => {
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
      onCancel={onClose}
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
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="플랫폼">{policy.platform}</Descriptions.Item>
            <Descriptions.Item label="채널">
              <Tag color={CHANNEL_COLOR[policy.channel] ?? "default"}>{policy.channel}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            preserve={false}
            initialValues={toFormValues(policy)}
          >
            <Form.Item
              label="최신 버전"
              name="latestVersion"
              extra="사용자에게 보여줄 버전 문자열입니다. 예: 1.4.2"
              rules={textRules("최신 버전을 입력하세요.")}
            >
              <Input placeholder="1.4.2" />
            </Form.Item>

            <Space size="middle" align="start">
              <Form.Item
                label={`최신 빌드 번호 (${MIN_BUILD_NUMBER} 이상)`}
                name="latestBuildNumber"
                rules={buildNumberRules("최신 빌드 번호를 입력하세요.")}
              >
                <InputNumber min={MIN_BUILD_NUMBER} precision={0} />
              </Form.Item>
              <Form.Item
                label={`최소 지원 빌드 번호 (${MIN_BUILD_NUMBER} 이상, 최신 빌드 번호 이하)`}
                name="minSupportedBuildNumber"
                extra="이 번호보다 낮은 빌드는 강제 업데이트 대상이 됩니다."
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
                <InputNumber min={MIN_BUILD_NUMBER} precision={0} />
              </Form.Item>
            </Space>

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
