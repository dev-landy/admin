"use client";

import { useState } from "react";
import { App, Alert, Descriptions, Form, Input, Modal, Segmented, Space, Spin, Tag, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useRemoteAlimtalkTemplate, useSendTestAlimtalk } from "../hooks";
import { ALIMTALK_STATUS_PRESENTATION, ALIMTALK_TYPE_OPTIONS } from "../presentation";
import type { AlimtalkType, SendTestAlimtalkResponse } from "../types";

const { Paragraph, Text } = Typography;

const PHONE_PATTERN = /^010-?\d{4}-?\d{4}$/;

type Props = { open: boolean; onClose: () => void };

/**
 * 운영자가 직접 입력한 번호와 변수값으로 실제 발송을 시도한다.
 *
 * <p>변수 입력칸은 요청 시점에 공급자에서 가져온 승인 템플릿으로 만든다. 보관 사본으로 만들면 승인 내용이 바뀐 뒤에도
 * 옛 변수 칸이 그대로 떠서 "테스트는 채웠는데 발송은 거절되는" 상태가 된다.
 *
 * <p>실제로 과금되는 발송이며 세입자 발송 이력에는 남지 않는다.
 */
export function AlimtalkTestSendModal({ open, onClose }: Props) {
  const { notification } = App.useApp();
  const [type, setType] = useState<AlimtalkType>("DUE");
  const [result, setResult] = useState<SendTestAlimtalkResponse | null>(null);
  const [form] = Form.useForm<{ phone: string; variables: Record<string, string> }>();
  const { data: remote, isFetching, error } = useRemoteAlimtalkTemplate(type, open);
  const { mutate: sendTest, isPending } = useSendTestAlimtalk();

  const remoteProblem = parseProblemDetail(error);

  function handleClose() {
    form.resetFields();
    setResult(null);
    onClose();
  }

  function handleTypeChange(next: AlimtalkType) {
    // 변수 이름은 종류마다 다르다. 남겨 두면 옛 종류의 값이 새 칸에 섞인다.
    form.resetFields(["variables"]);
    setResult(null);
    setType(next);
  }

  function handleOk() {
    form.validateFields().then((values) => {
      sendTest(
        { type, phone: values.phone, variables: values.variables ?? {} },
        {
          onSuccess: (response) => {
            setResult(response);
            notification.success({
              title: "테스트 발송을 요청했습니다.",
              description: `실제로 과금되는 발송입니다. 상태: ${ALIMTALK_STATUS_PRESENTATION[response.status].label}`,
            });
          },
          onError: (sendError) => {
            const problem = parseProblemDetail(sendError);
            notification.error({ title: problem?.title ?? "테스트 발송 실패", description: problem?.detail });
          },
        },
      );
    })
      // 폼이 오류를 그 자리에 표시하므로 여기서 더 할 일이 없다. 잡지 않으면 미처리 거부로 새어 나간다.
      .catch(() => undefined);
  }

  return (
    <Modal
      title="알림톡 테스트 발송"
      open={open}
      onOk={handleOk}
      onCancel={handleClose}
      okText="발송"
      cancelText="닫기"
      okButtonProps={{ disabled: !remote }}
      confirmLoading={isPending}
      width={560}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 16 }}>
        <Alert
          type="warning"
          showIcon
          title="실제로 과금되는 발송입니다"
          description="입력한 번호로 카카오 알림톡이 그대로 나갑니다. 세입자 발송 이력에는 남지 않으며, 건 추적은 메시지 ID로 공급자 콘솔에서 합니다."
        />
        <Segmented
          block
          value={type}
          onChange={(value) => handleTypeChange(value as AlimtalkType)}
          options={ALIMTALK_TYPE_OPTIONS}
        />
        {isFetching && <Spin />}
        {remoteProblem && (
          <Alert type="error" showIcon title={remoteProblem.title} description={remoteProblem.detail} />
        )}
        {remote && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="템플릿">{remote.name}</Descriptions.Item>
              <Descriptions.Item label="승인 본문">
                <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{remote.content}</Paragraph>
              </Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical">
              <Form.Item
                label="수신 번호"
                name="phone"
                rules={[
                  { required: true, message: "수신 번호를 입력하세요." },
                  { pattern: PHONE_PATTERN, message: "010으로 시작하는 휴대폰 번호를 입력하세요." },
                ]}
              >
                <Input placeholder="010-1234-5678" />
              </Form.Item>
              {remote.variableNames.map((name) => (
                <Form.Item
                  key={name}
                  label={<Text code>{name}</Text>}
                  name={["variables", name]}
                  rules={[{ required: true, whitespace: true, message: "값을 입력하세요." }]}
                >
                  <Input placeholder={name} />
                </Form.Item>
              ))}
            </Form>
          </>
        )}
        {result && (
          <Descriptions column={1} size="small" bordered title="발송 결과">
            <Descriptions.Item label="상태">
              <Tag color={ALIMTALK_STATUS_PRESENTATION[result.status].color}>
                {ALIMTALK_STATUS_PRESENTATION[result.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="메시지 ID">
              {result.messageId ? <Text code copyable>{result.messageId}</Text> : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="결과 코드">{result.providerCode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="채워진 내용">
              <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                {result.renderedContent}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Space>
    </Modal>
  );
}
