"use client";

import { useEffect, useRef, useState } from "react";
import { App, Alert, Button, Card, Descriptions, Form, Input, Space, Switch, Tag, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { formatSeconds } from "@/lib/format/date";
import { useRemoteAlimtalkTemplate, useUpdateAlimtalkTemplate } from "../hooks";
import { ALIMTALK_TYPE_PRESENTATION } from "../presentation";
import type { AlimtalkTemplate } from "../types";

const { Paragraph, Text } = Typography;

type FormValues = {
  pfId: string;
  templateId: string;
  body: string;
  enabled: boolean;
};

/**
 * 한 종류의 채널·템플릿·본문을 그 자리에서 고친다. 저장하면 재시작 없이 다음 발송부터 적용되고,
 * 같은 값이 실제 발송과 임대인 미리보기에 함께 반영된다.
 *
 * <p>본문은 카카오 승인 본문의 사본일 뿐이라 발송 문구를 바꾸지 못한다. 어긋나면 미리보기만 틀리므로,
 * 승인 템플릿 조회로 원본과 대조할 수 있게 둔다.
 */
export function AlimtalkTemplateCard({ template }: { template: AlimtalkTemplate }) {
  const { notification } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const hasDraftChanges = useRef(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const { mutate: update, isPending } = useUpdateAlimtalkTemplate();
  const {
    data: remote,
    isFetching: isRemoteFetching,
    error: remoteError,
  } = useRemoteAlimtalkTemplate(template.type, remoteOpen);
  const presentation = ALIMTALK_TYPE_PRESENTATION[template.type];

  // 백그라운드 재조회는 편집 중인 초안을 덮어쓰지 않는다. 깨끗한 폼만 최신 값으로 맞춘다.
  useEffect(() => {
    if (hasDraftChanges.current) return;
    form.setFieldsValue({
      pfId: template.pfId ?? "",
      templateId: template.templateId ?? "",
      body: template.body ?? "",
      enabled: template.enabled,
    });
  }, [form, template]);

  function handleSave() {
    if (isPending) return;
    form.validateFields().then((values) => {
      update(
        { type: template.type, body: values },
        {
          onSuccess: (saved) => {
            hasDraftChanges.current = false;
            form.setFieldsValue({ pfId: saved.pfId ?? "", templateId: saved.templateId ?? "", body: saved.body ?? "", enabled: saved.enabled });
            notification.success({ title: `${presentation.label} 템플릿을 저장했습니다.` });
          },
          onError: (error) => {
            const problem = parseProblemDetail(error);
            notification.error({ title: problem?.title ?? "저장 실패", description: problem?.detail });
          },
        },
      );
    })
      // 폼이 오류를 그 자리에 표시하므로 여기서 더 할 일이 없다. 잡지 않으면 미처리 거부로 새어 나간다.
      .catch(() => undefined);
  }

  const remoteProblem = parseProblemDetail(remoteError);

  return (
    <Card
      className="admin-operation-card"
      title={
        <Space wrap>
          <Tag color={presentation.color}>{presentation.label}</Tag>
          <Text type="secondary">{template.type}</Text>
        </Space>
      }
      extra={
        <Space wrap>
          <Tag color={template.sendable ? "green" : "default"}>
            {template.sendable ? "발송 가능" : "발송 불가"}
          </Tag>
          <Button loading={isRemoteFetching} onClick={() => setRemoteOpen(true)}>
            승인 템플릿 조회
          </Button>
          <Button type="primary" loading={isPending} disabled={isPending} onClick={handleSave}>
            저장
          </Button>
        </Space>
      }
    >
      {!template.sendable && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="이 종류는 지금 발송되지 않습니다"
          description="켜짐 여부와 채널 ID·템플릿 ID·본문이 모두 채워져야 발송됩니다. 하나라도 비면 미리보기도 막힙니다."
        />
      )}
      <Form name={`alimtalk-template-${template.type}`} form={form} layout="vertical" disabled={isPending} onValuesChange={() => { hasDraftChanges.current = true; }}>
        <Form.Item label="발송 사용" name="enabled" valuePropName="checked">
          <Switch aria-label={`${presentation.label} 발송 사용`} checkedChildren="사용" unCheckedChildren="중지" />
        </Form.Item>
        <Form.Item
          label="채널 ID (pfId)"
          name="pfId"
          rules={[{ max: 64, message: "64자를 넘을 수 없습니다." }]}
        >
          <Input placeholder="KA01PF..." />
        </Form.Item>
        <Form.Item
          label="템플릿 ID"
          name="templateId"
          rules={[{ max: 64, message: "64자를 넘을 수 없습니다." }]}
        >
          <Input placeholder="KA01TP..." />
        </Form.Item>
        <Form.Item
          label="본문 사본"
          name="body"
          extra="카카오 승인 본문과 같아야 합니다. 다르면 임대인 미리보기만 틀리고 실제 발송은 승인 본문으로 나갑니다."
          rules={[{ max: 2000, message: "2000자를 넘을 수 없습니다." }]}
        >
          <Input.TextArea rows={6} maxLength={2000} showCount placeholder="#{세대정보} 임대료 #{납부액}원의 납부일입니다." />
        </Form.Item>
      </Form>
      <Descriptions column={1} size="small" items={[
        { key: "updatedAt", label: "수정일", children: formatSeconds(template.updatedAt) },
      ]} />
      {remoteOpen && remoteProblem && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 16 }}
          title={remoteProblem.title}
          description={remoteProblem.detail}
        />
      )}
      {remoteOpen && remote && (
        <Card size="small" type="inner" title="공급자 승인 템플릿" style={{ marginTop: 16 }}>
          <Descriptions column={1} size="small" bordered items={[
            { key: "name", label: "이름", children: remote.name },
            { key: "status", label: "상태", children: remote.status },
            { key: "variables", label: "변수", children: remote.variableNames.length === 0 ? (
                "-"
              ) : (
                <Space wrap>
                  {remote.variableNames.map((name) => (
                    <Text code key={name}>
                      {name}
                    </Text>
                  ))}
                </Space>
              ) },
            { key: "content", label: "승인 본문", children: <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{remote.content}</Paragraph> },
          ]} />
          <Alert
            type={remote.storedBodyMatches ? "success" : "warning"}
            showIcon
            style={{ marginTop: 12 }}
            title={
              remote.storedBodyMatches
                ? "본문 사본이 승인 본문과 같습니다."
                : "본문 사본이 승인 본문과 다릅니다 — 임대인 미리보기가 실제 발송과 어긋납니다."
            }
            action={
              remote.storedBodyMatches ? undefined : (
                <Button size="small" disabled={isPending} onClick={() => { hasDraftChanges.current = true; form.setFieldsValue({ body: remote.content }); }}>
                  승인 본문 가져오기
                </Button>
              )
            }
          />
        </Card>
      )}
    </Card>
  );
}
