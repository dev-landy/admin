import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockRevokeSession = jest.fn();
jest.mock("@/features/auth/api", () => ({
  revokeSession: (...args: unknown[]) => mockRevokeSession(...args),
}));

import { AuthProvider, useAuth } from "@/features/auth/context";
import { tokenStore } from "@/features/auth/store";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test("completeLogin stores tokens and marks authenticated", () => {
  const { result } = renderHook(() => useAuth(), { wrapper });

  act(() => {
    result.current.completeLogin({ accessToken: "a", refreshToken: "r" });
  });

  expect(tokenStore.getAccessToken()).toBe("a");
  expect(tokenStore.getRefreshToken()).toBe("r");
  expect(result.current.isAuthenticated).toBe(true);
});

test("logout revokes server-side then clears locally even if revoke fails", async () => {
  tokenStore.setTokens({ accessToken: "a", refreshToken: "r" });
  mockRevokeSession.mockRejectedValue(new Error("network"));

  const { result } = renderHook(() => useAuth(), { wrapper });

  await act(async () => {
    await result.current.logout();
  });

  expect(mockRevokeSession).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" });
  expect(tokenStore.getAccessToken()).toBeNull();
  expect(tokenStore.getRefreshToken()).toBeNull();
  expect(mockReplace).toHaveBeenCalledWith("/login");
});
