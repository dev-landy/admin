"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { revokeSession } from "./api";
import { tokenStore } from "./store";
import type { AuthTokens } from "./types";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  /** Persist tokens obtained from the Kakao login flow and mark authenticated. */
  completeLogin: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const hasToken = !!tokenStore.getAccessToken();
    // Hydrate auth state from localStorage after mount — localStorage is
    // unavailable during SSR, so this must run in an effect. The one-time
    // synchronous setState here is intentional, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ isAuthenticated: hasToken, isLoading: false });
  }, []);

  const completeLogin = useCallback((tokens: AuthTokens) => {
    tokenStore.setTokens(tokens);
    setState({ isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    const accessToken = tokenStore.getAccessToken();
    const refreshToken = tokenStore.getRefreshToken();
    if (accessToken && refreshToken) {
      // Best-effort: revoke the refresh token server-side, but always clear
      // local state even if the call fails (network/expired token).
      try {
        await revokeSession({ accessToken, refreshToken });
      } catch {
        // ignore — proceed to clear local state
      }
    }
    tokenStore.clearTokens();
    setState({ isAuthenticated: false, isLoading: false });
    router.replace("/login");
  }, [router]);

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
