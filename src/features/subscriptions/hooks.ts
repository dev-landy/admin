import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSubscription, grantSubscription, reconcileSubscription, revokeSubscriptionGrant } from "./api";
import { userKeys } from "@/features/users/hooks";
import type { GrantOperation, SubscriptionEnvironment } from "./types";

export const subscriptionKey = (userId: number) => [...userKeys.detail(userId), "subscription"] as const;

export function useSubscription(userId: number) {
  return useQuery({
    queryKey: subscriptionKey(userId),
    queryFn: () => fetchSubscription(userId),
    refetchInterval: (query) => query.state.error ? false : query.state.data?.syncStatuses.some(
      (sync) => ["PENDING", "PROCESSING", "RETRY"].includes(sync.state),
    ) ? 5000 : false,
  });
}

export function useSubscriptionOperations(userId: number) {
  const client = useQueryClient();
  // An ambiguous network response may still have committed. Always re-read this account.
  const refresh = () => client.invalidateQueries({ queryKey: subscriptionKey(userId) });
  const grant = useMutation({ mutationFn: (operation: GrantOperation) => grantSubscription(userId, operation), onSettled: refresh });
  const revoke = useMutation({ mutationFn: ({ grantId, reason }: { grantId: number; reason: string }) => revokeSubscriptionGrant(userId, grantId, reason), onSettled: refresh });
  const reconcile = useMutation({ mutationFn: (environment: SubscriptionEnvironment) => reconcileSubscription(userId, environment), onSettled: refresh });
  return { grant, revoke, reconcile };
}
