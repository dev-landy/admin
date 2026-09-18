import type { AlimtalkStatus, AlimtalkTrigger, AlimtalkType } from "./types";

type Presentation = { label: string; color: string };

export const ALIMTALK_TYPE_PRESENTATION: Record<AlimtalkType, Presentation> = {
  DUE: { label: "납부일 안내", color: "blue" },
  OVERDUE: { label: "미납 안내", color: "red" },
};

export const ALIMTALK_TRIGGER_PRESENTATION: Record<AlimtalkTrigger, Presentation> = {
  SCHEDULED: { label: "자동(배치)", color: "geekblue" },
  MANUAL: { label: "수동(임대인)", color: "purple" },
};

// SENT는 "전달 완료"가 아니라 공급자가 접수했다는 뜻이다. 화면 문구도 거기까지만 주장한다.
export const ALIMTALK_STATUS_PRESENTATION: Record<AlimtalkStatus, Presentation> = {
  PENDING: { label: "제출 대기", color: "default" },
  SENT: { label: "발송 요청됨", color: "green" },
  FAILED: { label: "실패", color: "red" },
  UNKNOWN: { label: "접수 불명", color: "orange" },
};

function toOptions<T extends string>(presentation: Record<T, Presentation>) {
  return (Object.entries(presentation) as [T, Presentation][]).map(([value, { label }]) => ({
    value,
    label,
  }));
}

export const ALIMTALK_TYPE_OPTIONS = toOptions(ALIMTALK_TYPE_PRESENTATION);
export const ALIMTALK_TRIGGER_OPTIONS = toOptions(ALIMTALK_TRIGGER_PRESENTATION);
export const ALIMTALK_STATUS_OPTIONS = toOptions(ALIMTALK_STATUS_PRESENTATION);
