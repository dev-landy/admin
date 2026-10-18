import { Descriptions, Space, Typography } from "antd";

import { formatSeconds } from "@/lib/format/date";
import type { AlimtalkTemplate } from "../types";

const { Paragraph, Text } = Typography;

function text(value: string | null) {
  return value ? <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</Paragraph> : "-";
}

function actions(items: Record<string, unknown>[]) {
  if (items.length === 0) return "-";
  return <Space orientation="vertical" size="small">{items.map((item, index) => (
    <Paragraph key={index} style={{ marginBottom: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {Object.values(item).filter((value) => typeof value === "string" || typeof value === "boolean").map(String).join(" · ")}
    </Paragraph>
  ))}</Space>;
}

/** 편집과 테스트 발송이 동일한 저장 승인 정보를 보여준다. */
export function ApprovedAlimtalkDetails({ template }: { template: AlimtalkTemplate }) {
  return <Descriptions column={1} size="small" bordered items={[
    { key: "templateId", label: "저장된 템플릿 ID", children: template.templateId ?? "-" },
    { key: "form", label: "형태", children: template.form === "TEXT" ? "강조형 (TEXT)" : template.form === "NONE" ? "기본형 (NONE)" : "-" },
    { key: "messageType", label: "메시지 유형", children: template.messageType ?? "-" },
    { key: "status", label: "승인 상태", children: template.status ?? "-" },
    { key: "syncedAt", label: "승인 정보 갱신일", children: template.syncedAt ? formatSeconds(template.syncedAt) : "-" },
    { key: "subtitle", label: "승인 부제목", children: text(template.subtitle) },
    { key: "title", label: "승인 제목", children: text(template.title) },
    { key: "content", label: "승인 본문", children: text(template.content) },
    { key: "extra", label: "부가정보", children: text(template.extra) },
    { key: "ad", label: "광고 안내", children: text(template.ad) },
    { key: "buttons", label: "버튼", children: actions(template.buttons) },
    { key: "quickReplies", label: "바로 응답", children: actions(template.quickReplies) },
    { key: "variables", label: "변수", children: template.variableNames.length === 0 ? "-" : <Space wrap>{template.variableNames.map((name) => <Text code key={name}>{name}</Text>)}</Space> },
  ]} />;
}
