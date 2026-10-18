"use client";

import { useRef, useState } from "react";
import { App, Alert, Descriptions, Form, Input, Modal, Segmented, Space, Spin, Tag, Typography } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { parseProblemDetail } from "@/lib/api/problem";
import { useAlimtalkTemplates, useSendTestAlimtalk } from "../hooks";
import { ApprovedAlimtalkDetails } from "./ApprovedAlimtalkDetails";
import { ALIMTALK_STATUS_PRESENTATION, ALIMTALK_TYPE_OPTIONS } from "../presentation";
import type { AlimtalkType, SendTestAlimtalkResponse } from "../types";

const { Paragraph, Text } = Typography;

const PHONE_PATTERN = /^010-?\d{4}-?\d{4}$/;

type Props = { open: boolean; onClose: () => void };

/**
 * 운영자가 직접 입력한 번호와 변수값으로 실제 발송을 시도한다.
 *
 * <p>변수 입력칸과 표시 내용은 실제 발송과 같은 저장 승인 정보로 만든다.
 *
 * <p>실제로 과금되는 발송이며 세입자 발송 이력에는 남지 않는다.
 */
export function AlimtalkTestSendModal({ open, onClose }: Props) {
  const { notification } = App.useApp();
  const [type, setType] = useState<AlimtalkType>("DUE");
  const sendInProgress = useRef(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<SendTestAlimtalkResponse | null>(null);
  const [form] = Form.useForm<{ phone: string; variables: Record<string, string> }>();
  const { data, isFetching, error, refetch } = useAlimtalkTemplates(open);
  const template = data?.templates.find((item) => item.type === type);
  const approved = template != null && !!template.pfId?.trim() && !!template.templateId?.trim() && !template.syncRequired && template.status === "APPROVED"
    && template.content != null && template.content.trim().length > 0
    && (template.form === "NONE" || (template.form === "TEXT" && !!template.title?.trim() && !!template.subtitle?.trim()));
  const { mutate: sendTest, isPending } = useSendTestAlimtalk();

  const sending = isPending || validating;
  const queryProblem = parseProblemDetail(error);

  function handleClose() {
    if (sending || sendInProgress.current) return;
    if (approved && template) form.resetFields();
    setResult(null);
    onClose();
  }

  function handleTypeChange(next: AlimtalkType) {
    if (sending || sendInProgress.current) return;
    // 변수 이름은 종류마다 다르다. 남겨 두면 옛 종류의 값이 새 칸에 섞인다.
    if (approved && template) form.resetFields(["variables"]);
    setResult(null);
    setType(next);
  }

  function handleOk() {
    if (sending || sendInProgress.current || isFetching || error || !approved || !template) return;
    sendInProgress.current = true;
    setValidating(true);
    const finish = () => { sendInProgress.current = false; setValidating(false); };
    form.validateFields().then((values) => {
      sendTest(
        { type, phone: values.phone, variables: Object.fromEntries(template.variableNames.map((name) => [name, values.variables?.[name] ?? ""])) },
        {
          onSuccess: (response) => {
            finish();
            setResult(response);
            const feedback = response.status === "FAILED" || response.status === "UNKNOWN" ? notification.warning : notification.success;
            feedback({
              title: response.status === "FAILED" ? "테스트 발송에 실패했습니다." : "테스트 발송을 요청했습니다.",
              description: `실제로 과금되는 발송입니다. 상태: ${ALIMTALK_STATUS_PRESENTATION[response.status].label}`,
            });
          },
          onError: (sendError) => {
            finish();
            const problem = parseProblemDetail(sendError);
            notification.error({ title: problem?.title ?? "테스트 발송 실패", description: problem?.detail });
          },
        },
      );
    })
      // 폼이 오류를 그 자리에 표시하므로 여기서 더 할 일이 없다. 잡지 않으면 미처리 거부로 새어 나간다.
      .catch(finish);
  }

  return (
    <Modal
      title="알림톡 테스트 발송"
      open={open}
      onOk={handleOk}
      onCancel={handleClose}
      okText="발송"
      cancelText="닫기"
      okButtonProps={{ disabled: !approved || isFetching || !!error || sending }}
      cancelButtonProps={{ disabled: sending }}
      closable={!sending}
      mask={{ closable: !sending }}
      keyboard={!sending}
      confirmLoading={sending}
      width={640}
      style={{ top: 24 }}
      styles={{ body: { maxHeight: "calc(100dvh - 200px)", overflowY: "auto", paddingInlineEnd: 4 } }}
      destroyOnHidden
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%", marginTop: 16 }}>
        <Alert
          type="warning"
          showIcon
          title="실제로 과금되는 발송입니다"
          description="입력한 번호로 카카오 알림톡이 그대로 나갑니다. 세입자 발송 이력에는 남지 않으며, 건 추적은 메시지 ID로 공급자 콘솔에서 합니다."
        />
        <Segmented
          block
          disabled={sending}
          value={type}
          onChange={(value) => handleTypeChange(value as AlimtalkType)}
          options={ALIMTALK_TYPE_OPTIONS}
        />
        {isFetching && <Spin />}
        {error && (
          <QueryErrorAlert error={error} title={queryProblem?.title ?? "승인 템플릿을 불러오지 못했습니다."} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        )}
        {!isFetching && !error && !approved && <Alert type="warning" showIcon
          title="저장된 승인 정보가 필요합니다"
          description="템플릿 설정에서 ID를 저장하거나 승인 정보를 갱신한 뒤 테스트 발송을 다시 열어 주세요." />}
        {template?.content != null && <ApprovedAlimtalkDetails template={template} />}
        {approved && template && (
          <>
            <Form name="alimtalk-test-send" form={form} layout="vertical" disabled={sending}>
              <Form.Item
                label="수신 번호"
                name="phone"
                rules={[
                  { required: true, message: "수신 번호를 입력하세요." },
                  { pattern: PHONE_PATTERN, message: "010으로 시작하는 휴대폰 번호를 입력하세요." },
                ]}
              >
                <Input type="tel" autoComplete="tel" placeholder="010-1234-5678" />
              </Form.Item>
              {template.variableNames.map((name) => (
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
          <Descriptions column={1} size="small" bordered title="발송 결과" items={[
            { key: "status", label: "상태", children: <Tag color={ALIMTALK_STATUS_PRESENTATION[result.status].color}>
                {ALIMTALK_STATUS_PRESENTATION[result.status].label}
              </Tag> },
            { key: "messageId", label: "메시지 ID", children: result.messageId ? <Text code copyable>{result.messageId}</Text> : "-" },
            { key: "providerCode", label: "결과 코드", children: result.providerCode ?? "-" },
            ...(result.renderedTitle ? [{ key: "title", label: "채워진 제목", children: result.renderedTitle }] : []),
            { key: "content", label: "채워진 내용", children: <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{result.renderedContent}</Paragraph> },
          ]} />
        )}
      </Space>
    </Modal>
  );
}
