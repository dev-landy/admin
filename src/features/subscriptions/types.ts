export type SubscriptionEnvironment = "PRODUCTION" | "SANDBOX";

export type SubscriptionGrant = {
  grantId: number;
  entitlementKey: string;
  startsAt: string;
  expiresAt: string | null;
  permanent: boolean;
  active: boolean;
  createdByKind: string;
  createdByAdminId: number | null;
  createdByOperator: string | null;
  reason: string;
  requestKey: string | null;
  revokedAt: string | null;
  revokedByAdminId: number | null;
  revokeReason: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type SubscriptionSync = {
  environment: SubscriptionEnvironment;
  state: "PENDING" | "PROCESSING" | "RETRY" | "DEAD" | "SUCCEEDED" | "STOPPED";
  requestedGeneration: number;
  appliedGeneration: number;
  nextAttemptAt: string | null;
  attempts: number;
  lastErrorCode: string | null;
  lastSuccessAt: string | null;
};

export type StoreSubscription = {
  id: number;
  environment: SubscriptionEnvironment;
  revenuecatSubscriptionId: string;
  productId: string;
  productIdentifier: string | null;
  plan: string | null;
  store: string;
  status: string;
  givesAccess: boolean;
  active: boolean;
  autoRenewalStatus: string;
  currentPeriodEnd: string | null;
  accessEnd: string | null;
  verifiedAccessUntil: string | null;
  managementUrl: string | null;
  fetchedAt: string | null;
  deletedAt: string | null;
};

export type SubscriptionDetail = {
  userId: number;
  appUserId: string;
  withdrawnAt: string | null;
  effectiveAccess: {
    tier: string;
    active: boolean;
    permanent: boolean;
    validUntil: string | null;
    verificationRequiredAt: string | null;
    verificationState: string;
    sources: string[];
  };
  storeSubscriptions: StoreSubscription[];
  grants: SubscriptionGrant[];
  syncStatuses: SubscriptionSync[];
};

export type GrantRequest = { permanent: boolean; expiresAt: string | null; reason: string };
export type GrantOperation = { request: GrantRequest; requestKey: string };
