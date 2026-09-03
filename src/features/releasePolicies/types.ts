export type AppPlatform = "ANDROID" | "IOS";
export type ReleaseChannel = "DEVELOPMENT" | "PREVIEW" | "PRODUCTION";

export type ReleasePolicy = {
  appReleasePolicyId: number;
  platform: AppPlatform;
  channel: ReleaseChannel;
  latestBuildNumber: number;
  latestVersion: string;
  minSupportedBuildNumber: number;
  storeUrl: string;
  forceUpdateTitle: string;
  forceUpdateMessage: string;
  softUpdateTitle: string;
  softUpdateMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type ReleasePoliciesResponse = { releasePolicies: ReleasePolicy[] };

// platform·channel은 정책의 식별자라 수정 대상이 아니다. 나머지 값은 전부 다시 보낸다.
export type UpdateReleasePolicyRequest = {
  latestBuildNumber: number;
  latestVersion: string;
  minSupportedBuildNumber: number;
  storeUrl: string;
  forceUpdateTitle: string;
  forceUpdateMessage: string;
  softUpdateTitle: string;
  softUpdateMessage: string;
};
