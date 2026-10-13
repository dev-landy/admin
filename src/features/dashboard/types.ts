export type SourceError = { status: "error"; code: string; message: string };
export type SourceResult<T> = SourceError | { status: "success"; data: T; fetchedAt: string };
export type ActivitySeries = "전체" | "정보 관리" | "수납 관리";
export type ActivityPoint = { date: string; all: number; info: number; rent: number };
export type Cohort = { week: string; users: number; values: (number | "집계 중" | "—")[] };
export type PosthogData = {
  start: string; end: string;
  retentionRange: { start: string; end: string };
  activity: ActivityPoint[]; mau: number; previousMau: number;
  retention: { rate: number | null; base: number; returned: number; from: string; to: string };
  cohorts: Cohort[];
};
export type AdsCampaign = { id: string; name: string; cost: number; conversions: number; cpa: number | null };
export type AdsData = {
  start: string; end: string; currency: string; timezone: string;
  cost: number; conversions: number; cpa: number | null; campaigns: AdsCampaign[];
};

export type ActivityData = Pick<PosthogData, "start" | "end" | "activity" | "mau" | "previousMau">;
export type RetentionData = Pick<PosthogData, "retentionRange" | "retention" | "cohorts">;
export type ActivationData = { start: string; end: string; logins: number; eligible: number; registered: number; viewed: number; pending: number; rate: number | null };
