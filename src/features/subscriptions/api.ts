import { apiClient } from "@/lib/api/client";
import type { GrantOperation, SubscriptionDetail, SubscriptionEnvironment, SubscriptionGrant, SubscriptionSync } from "./types";

const path = (userId: number) => `/v1/admin/users/${userId}/subscription`;

export async function fetchSubscription(userId: number): Promise<SubscriptionDetail> {
  return (await apiClient.get<SubscriptionDetail>(path(userId))).data;
}

export async function grantSubscription(userId: number, { request, requestKey }: GrantOperation): Promise<SubscriptionGrant> {
  return (await apiClient.post<SubscriptionGrant>(`${path(userId)}/grants`, request, {
    headers: { "Idempotency-Key": requestKey },
  })).data;
}

export async function revokeSubscriptionGrant(userId: number, grantId: number, reason: string): Promise<SubscriptionGrant> {
  return (await apiClient.post<SubscriptionGrant>(`${path(userId)}/grants/${grantId}/revoke`, { reason })).data;
}

export async function reconcileSubscription(userId: number, environment: SubscriptionEnvironment): Promise<SubscriptionSync> {
  return (await apiClient.post<SubscriptionSync>(`${path(userId)}/reconcile`, { environment })).data;
}
