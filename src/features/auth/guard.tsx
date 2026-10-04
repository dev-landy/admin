"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

import { useAuth } from "./context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100dvh",
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" aria-label="로그인 상태를 확인하는 중" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
