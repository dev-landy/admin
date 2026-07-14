import { USER_STATUS_OPTIONS, USER_STATUS_PRESENTATION } from "@/features/users/userStatus";

describe("user status presentation", () => {
  it.each([
    ["DRAFT", "생성중"],
    ["VERIFIED", "번호 인증 완료"],
    ["ONBOARDED", "온보딩 완료"],
  ] as const)("%s 상태를 %s로 표시한다", (status, label) => {
    expect(USER_STATUS_PRESENTATION[status].label).toBe(label);
    expect(USER_STATUS_OPTIONS).toContainEqual({ value: status, label });
  });
});
