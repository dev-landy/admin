import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { deactivateFcmToken, fetchUserFcmTokens, fetchUsers } from "@/features/users/api";
import { userKeys, useDeactivateFcmToken, useUserFcmTokens, useUsers } from "@/features/users/hooks";

jest.mock("@/features/users/api", () => ({ deactivateFcmToken: jest.fn(), fetchUserFcmTokens: jest.fn(), fetchUsers: jest.fn() }));

test("등록 기기 비활성화 후 사용자 목록 OS를 갱신하고 관련 없는 사용자 상세·기기 캐시는 유지한다", async () => {
  let active = true;
  jest.mocked(fetchUsers).mockImplementation(async () => ({ users: [{
    userId: 12, email: "landy@example.com", phone: null, provider: "KAKAO", role: "USER", status: "ONBOARDED",
    createdAt: "2026-10-05T09:00:00", fcmPlatforms: active ? ["ANDROID"] : [],
  }], page: 0, size: 20, totalElements: 1 }));
  jest.mocked(fetchUserFcmTokens).mockImplementation(async () => ({ fcmTokens: active ? [{
    fcmTokenId: 88, userId: 12, value: "masked-token...", platform: "ANDROID", silentWakeupSubscribed: false,
    createdAt: "2026-10-05T09:00:00", updatedAt: "2026-10-05T09:00:00",
  }] : [], page: 0, size: 20, totalElements: active ? 1 : 0 }));
  jest.mocked(deactivateFcmToken).mockImplementation(async () => { active = false; });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  const inactiveList = userKeys.list({ page: 2, size: 20, provider: "APPLE" });
  const unrelatedKeys = [userKeys.detail(12), userKeys.fcmTokenPage(99, 1, 20), ["payments", "list"]];
  for (const queryKey of [inactiveList, ...unrelatedKeys]) client.setQueryData(queryKey, { before: true });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => ({ users: useUsers({ page: 1, size: 20 }), tokens: useUserFcmTokens(12), deactivate: useDeactivateFcmToken(12) }), { wrapper });

  try {
    await waitFor(() => expect(hook.result.current.users.data?.users[0].fcmPlatforms).toEqual(["ANDROID"]));
    await waitFor(() => expect(hook.result.current.tokens.data?.totalElements).toBe(1));
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(fetchUserFcmTokens).toHaveBeenCalledTimes(1);

    await act(() => hook.result.current.deactivate.mutateAsync(88));
    expect(deactivateFcmToken).toHaveBeenCalledWith(88);
    await waitFor(() => expect(hook.result.current.users.data?.users[0].fcmPlatforms).toEqual([]));
    expect(hook.result.current.tokens.data?.totalElements).toBe(0);
    expect(fetchUsers).toHaveBeenCalledTimes(2);
    expect(fetchUserFcmTokens).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(inactiveList)?.isInvalidated).toBe(true);
    for (const queryKey of unrelatedKeys) expect(client.getQueryState(queryKey)?.isInvalidated).toBe(false);
  } finally {
    hook.unmount();
    client.clear();
  }
});
