/** 납부일 안내(`DUE`)는 배치가, 미납 안내(`OVERDUE`)는 임대인이 직접 확인하고 요청할 때만 나간다. */
export type AlimtalkType = "DUE" | "OVERDUE";

/** 발송을 누가 발동했는지. `SCHEDULED`는 배치, `MANUAL`은 임대인 요청이다. */
export type AlimtalkTrigger = "SCHEDULED" | "MANUAL";

/**
 * `SENT`는 공급자 접수 확인이지 최종 전달 성공이 아니다. `UNKNOWN`은 접수 여부 자체가 불명이라
 * 자동 재전송을 하지 않는다 — 재전송은 곧 이중 발송이자 이중 과금이다.
 */
export type AlimtalkStatus = "READY" | "PENDING" | "SENT" | "FAILED" | "UNKNOWN";

export type AlimtalkRecipientType = "TENANT" | "USER";

/** 수신자 이름·전화번호는 이력 snapshot이 아니다. 표시 정보는 현재 활성 연결 정보이며 실제 발송 건은 `messageId`로 공급자 콘솔에서 찾는다. */
export type AlimtalkSummary = {
  userEmail?: string | null;
  userPhone?: string | null;
  tenantName?: string | null;
  tenantPhone?: string | null;
  propertyName?: string | null;
  roomNumber?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;

  alimtalkId: number;
  userId: number;
  recipientType: AlimtalkRecipientType;
  recipientId: number;
  type: AlimtalkType;
  triggerSource: AlimtalkTrigger;
  status: AlimtalkStatus;
  billingMonth: string;
  targetDate: string;
  amount: number | null;
  messageId: string | null;
  providerCode: string | null;
  requestedAt: string;
  updatedAt: string;
};

export type ResolveAlimtalkRequest = {
  status: "SENT" | "FAILED" | "UNKNOWN";
  messageId?: string;
};

export type AlimtalksListParams = { sort?: string;
  page?: number;
  size?: number;
  userId?: number;
  tenantId?: number;
  type?: AlimtalkType;
  triggerSource?: AlimtalkTrigger;
  status?: AlimtalkStatus;
  from?: string;
  to?: string;
  alimtalkId?: number;
  messageId?: string;
  requestedFrom?: string;
  requestedTo?: string;
};

export type AlimtalksListResponse = {
  alimtalks: AlimtalkSummary[];
  page: number;
  size: number;
  totalElements: number;
};

/** `sendable`은 켜져 있고 채널·템플릿·본문이 모두 채워졌는지다. 하나라도 비면 발송이 막힌다. */
export type AlimtalkTemplate = {
  type: AlimtalkType;
  pfId: string | null;
  templateId: string | null;
  body: string | null;
  enabled: boolean;
  sendable: boolean;
  updatedAt: string;
};

export type AlimtalkTemplatesResponse = { templates: AlimtalkTemplate[] };

/** 생략한 값은 서버가 유지한다. 채널만 바꾸려고 본문을 다시 붙여넣지 않아도 된다. */
export type UpdateAlimtalkTemplateRequest = {
  pfId?: string;
  templateId?: string;
  body?: string;
  enabled?: boolean;
};

/**
 * 공급자에 등록된 승인 템플릿의 요청 시점 내용이다.
 *
 * <p>`storedBodyMatches`가 false면 우리가 보관한 본문 사본이 승인 본문과 어긋났다는 뜻이고,
 * 임대인 미리보기만 틀리고 실제 발송은 승인 본문으로 나간다.
 */
export type RemoteAlimtalkTemplate = {
  type: AlimtalkType;
  templateId: string;
  name: string;
  status: string;
  content: string;
  variableNames: string[];
  storedBodyMatches: boolean;
};

export type SendTestAlimtalkRequest = {
  type: AlimtalkType;
  phone: string;
  variables: Record<string, string>;
};

/** 실제로 과금되는 발송이며 세입자 발송 이력에는 남지 않는다. */
export type SendTestAlimtalkResponse = {
  status: AlimtalkStatus;
  messageId: string | null;
  providerCode: string | null;
  renderedContent: string;
};
