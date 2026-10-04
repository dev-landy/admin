import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { deleteUser, updateUserRole } from "@/features/users/api";
import { userKeys, useDeleteUser, useUpdateUserRole } from "@/features/users/hooks";
import { updateTenant } from "@/features/tenants/api";
import { tenantKeys, useUpdateTenant } from "@/features/tenants/hooks";
import { updateAlimtalkTemplate } from "@/features/alimtalk/api";
import { alimtalkKeys, useUpdateAlimtalkTemplate } from "@/features/alimtalk/hooks";

jest.mock("@/features/users/api", () => ({ deleteUser: jest.fn(), updateUserRole: jest.fn() }));
jest.mock("@/features/tenants/api", () => ({ updateTenant: jest.fn() }));
jest.mock("@/features/alimtalk/api", () => ({ updateAlimtalkTemplate: jest.fn() }));

test("권한·임차인 변경은 영향받은 상세와 목록을 한 번씩 재조회하고 비활성 캐시도 무효화한다", async () => {
  jest.mocked(updateUserRole).mockResolvedValue({ userId: 1, role: "ADMIN" });
  jest.mocked(updateTenant).mockResolvedValue(undefined);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const activeKeys = [userKeys.detail(1), userKeys.list({ page: 1, size: 20 }), tenantKeys.detail(2), tenantKeys.list({ page: 1, size: 20 }), ["properties", "user", 1]];
  const inactiveKeys = [userKeys.detail(3), tenantKeys.detail(4), ["properties", "user", 5]];
  const unrelatedKey = ["payments", "list"];
  const fetches = activeKeys.map(() => jest.fn(async () => ({ refreshed: true })));
  const observers = activeKeys.map((queryKey, index) => new QueryObserver(client, {
    queryKey,
    queryFn: fetches[index],
    initialData: { refreshed: false },
  }));
  const unsubscribe = observers.map((observer) => observer.subscribe(() => {}));
  for (const key of [...inactiveKeys, unrelatedKey]) client.setQueryData(key, { refreshed: false });
  const roleHook = renderHook(() => useUpdateUserRole(1), { wrapper });
  const tenantHook = renderHook(() => useUpdateTenant(2), { wrapper });

  try {
    await act(() => roleHook.result.current.mutateAsync("ADMIN"));
    expect(fetches.map((fetch) => fetch.mock.calls.length)).toEqual([1, 1, 0, 0, 0]);
    expect(client.getQueryState(inactiveKeys[0])?.isInvalidated).toBe(true);
    expect(client.getQueryState(inactiveKeys[1])?.isInvalidated).toBe(false);

    fetches.forEach((fetch) => fetch.mockClear());
    await act(() => tenantHook.result.current.mutateAsync({ dueAlimtalkEnabled: true }));
    expect(fetches.map((fetch) => fetch.mock.calls.length)).toEqual([1, 1, 1, 1, 1]);
    for (const key of inactiveKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  } finally {
    roleHook.unmount();
    tenantHook.unmount();
    unsubscribe.forEach((stop) => stop());
    client.clear();
  }
});

test("알림톡 템플릿 저장은 활성 승인 템플릿을 한 번만 재조회한다", async () => {
  jest.mocked(updateAlimtalkTemplate).mockResolvedValue({ type: "DUE", pfId: "channel", templateId: "template", body: "납부일 안내", enabled: true, sendable: true, updatedAt: "2026-10-04T12:00:00" });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const fetchRemote = jest.fn(async () => ({ refreshed: true }));
  const observer = new QueryObserver(client, {
    queryKey: alimtalkKeys.remoteTemplate("DUE"), queryFn: fetchRemote, initialData: { refreshed: false },
  });
  const unsubscribe = observer.subscribe(() => {});
  client.setQueryData(alimtalkKeys.templates, { refreshed: false });
  const hook = renderHook(() => useUpdateAlimtalkTemplate(), { wrapper });

  try {
    await act(() => hook.result.current.mutateAsync({ type: "DUE", body: { body: "납부일 안내" } }));
    expect(fetchRemote).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(alimtalkKeys.templates)?.isInvalidated).toBe(true);
  } finally {
    hook.unmount();
    unsubscribe();
    client.clear();
  }
});

test("유저 삭제는 함께 삭제된 도메인 캐시를 무효화하고 공용 설정은 유지한다", async () => {
  jest.mocked(deleteUser).mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const affectedKeys = [
    userKeys.detail(1), userKeys.fcmTokenPage(1, 1, 20), userKeys.tenantPage(1, 1, 20),
    ["properties", "user", 1], tenantKeys.detail(2), ["payments", "list"], ["payments", "duplicates"],
    ["notifications", "list"], ["notifications", "outbox"], ["contract-documents", "list"],
    ["contract-documents", "document-1", "files"], alimtalkKeys.list({ userId: 1 }),
  ];
  const independentKeys = [alimtalkKeys.templates, alimtalkKeys.remoteTemplate("DUE"), ["release-policies"], ["batch", "schedules"]];
  for (const key of [...affectedKeys, ...independentKeys]) client.setQueryData(key, { before: true });
  const hook = renderHook(() => useDeleteUser(), { wrapper });

  try {
    await act(() => hook.result.current.mutateAsync(1));
    expect(deleteUser).toHaveBeenCalledWith(1);
    for (const key of affectedKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of independentKeys) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  } finally {
    hook.unmount();
    client.clear();
  }
});
