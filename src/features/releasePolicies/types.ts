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
