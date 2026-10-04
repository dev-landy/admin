"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { revokeSession } from "./api";
import { tokenStore } from "./store";
import type { AuthTokens } from "./types";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
};

type AuthContextValue = AuthState & {
  /** Persist tokens obtained from the Kakao login flow and mark authenticated. */
  completeLogin: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isLoggingOut: false,
  });
  const sessionGeneration = useRef(0);
  const logoutOperation = useRef<{ promise: Promise<void> } | null>(null);

  useEffect(() => {
    const hasToken = !!tokenStore.getAccessToken();
    // Hydrate auth state from localStorage after mount — localStorage is
    // unavailable during SSR, so this must run in an effect. The one-time
    // synchronous setState here is intentional, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ isAuthenticated: hasToken, isLoading: false, isLoggingOut: false });
  }, []);

  const completeLogin = useCallback((tokens: AuthTokens) => {
    sessionGeneration.current += 1;
    logoutOperation.current = null;
    // 새 세션에서 이전 계정의 fresh 캐시나 진행 중 조회를 재사용하지 않는다.
    queryClient.clear();
    tokenStore.setTokens(tokens);
    setState({ isAuthenticated: true, isLoading: false, isLoggingOut: false });
  }, [queryClient]);

  const logout = useCallback((): Promise<void> => {
    // 같은 이벤트 루프 안의 연속 클릭도 한 서버 철회와 같은 완료 Promise를 공유한다.
    if (logoutOperation.current) return logoutOperation.current.promise;
    const accessToken = tokenStore.getAccessToken();
    const refreshToken = tokenStore.getRefreshToken();
    const generation = sessionGeneration.current;
    const operation = { promise: Promise.resolve() };
    logoutOperation.current = operation;
    setState((current) => ({ ...current, isLoggingOut: true }));
    operation.promise = (async () => {
      try {
        if (accessToken && refreshToken) {
          // 전체 세션 철회가 끝나기 전에 새 로그인을 유도하지 않는다.
          try {
            await revokeSession({ accessToken, refreshToken });
          } catch {
            // 서버 철회 실패에도 로컬 세션은 종료한다.
          }
        }
        // 이전 로그아웃의 늦은 응답은 새 로그인 소유의 토큰·캐시를 정리할 수 없다.
        if (sessionGeneration.current !== generation) return;
        tokenStore.clearTokens();
        // clear는 진행 중 조회도 동기 취소하므로 늦은 응답이 다음 세션 캐시에 남지 않는다.
        queryClient.clear();
        setState({ isAuthenticated: false, isLoading: false, isLoggingOut: false });
        router.replace("/login");
      } finally {
        if (logoutOperation.current === operation) logoutOperation.current = null;
      }
    })();
    return operation.promise;
  }, [queryClient, router]);

  return (
    <AuthContext.Provider value={{ ...state, completeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
