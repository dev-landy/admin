import type { AlimtalkTemplate } from "@/features/alimtalk/types";

export const approvedAlimtalkTemplate: AlimtalkTemplate = {
  type: "DUE", pfId: "channel", templateId: "template", body: "승인 본문 #{이름}",
  enabled: true, sendable: true, updatedAt: "2026-10-18T10:00:00", form: "TEXT",
  content: "승인 본문 #{이름}", title: "승인 제목 #{제목}", subtitle: "제목 위 안내",
  extra: "부가 안내", ad: null, variableNames: ["#{이름}", "#{제목}", "#{버튼}", "#{링크}"], status: "APPROVED",
  syncedAt: "2026-10-18T10:00:00", messageType: "BA",
  buttons: [{ buttonName: "확인 #{버튼}", buttonType: "WL", linkMo: "https://example.com/#{링크}" }],
  quickReplies: [], syncRequired: false,
};
