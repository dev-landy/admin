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

import { devLogin } from "./api";
import { tokenStore } from "./store";
import type { OAuthProvider } from "./types";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (sub: string, provider?: OAuthProvider) => Promise<void>;
  logout: () => void;
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
    setState({ isAuthenticated: hasToken, isLoading: false });
  }, []);

  const login = useCallback(async (sub: string, provider: OAuthProvider = "KAKAO") => {
    const tokens = await devLogin({ provider, sub });
    tokenStore.setTokens(tokens);
    setState({ isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    tokenStore.clearTokens();
    setState({ isAuthenticated: false, isLoading: false });
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
