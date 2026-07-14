import type { UserStatus } from "./types";

type UserStatusPresentation = {
  label: string;
  color: string;
};

export const USER_STATUS_PRESENTATION: Record<UserStatus, UserStatusPresentation> = {
  DRAFT: { label: "생성중", color: "orange" },
  VERIFIED: { label: "번호 인증 완료", color: "blue" },
  ONBOARDED: { label: "온보딩 완료", color: "green" },
};

export const USER_STATUS_OPTIONS = Object.entries(USER_STATUS_PRESENTATION).map(
  ([value, { label }]) => ({ value: value as UserStatus, label }),
);
