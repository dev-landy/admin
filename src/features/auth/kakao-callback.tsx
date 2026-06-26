"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import { useAuth } from "./context";
import type { AuthTokens } from "./types";

type KakaoCallbackProps = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

const centerStyle = {
  display: "flex",
  height: "100vh",
  alignItems: "center",
  justifyContent: "center",
} as const;

/** Failures knowable from the callback params alone, without any network call. */
function resolveImmediateFailure({
  code,
  state,
  error,
  errorDescription,
}: KakaoCallbackProps): string | null {
  if (error) {
    return error === "access_denied"
      ? "카카오 로그인이 취소되었습니다."
      : errorDescription || "카카오 로그인에 실패했습니다.";
  }
  if (!code || !state) {
    return "잘못된 접근입니다. 다시 로그인해주세요.";
  }
  return null;
}

function messageForStatus(status: number): string {
  if (status === 400) return "로그인 세션이 만료되었습니다. 다시 시도해주세요.";
  if (status === 401) return "인증에 실패했습니다. 다시 로그인해주세요.";
  if (status === 502) return "카카오 인증에 실패했습니다. 다시 시도해주세요.";
  return "로그인에 실패했습니다. 다시 시도해주세요.";
}

export function KakaoCallback(props: KakaoCallbackProps) {
  const { code, state } = props;
  const router = useRouter();
  const { completeLogin } = useAuth();
  const [exchangeFailure, setExchangeFailure] = useState<string | null>(null);
  // Guard against React StrictMode double-invoke: the code + state cookie are
  // single-use, so the exchange must run exactly once.
  const startedRef = useRef(false);

  // Derived from params during render — no effect/setState needed.
  const immediateFailure = resolveImmediateFailure(props);

  useEffect(() => {
    if (immediateFailure || startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const response = await fetch("/auth/kakao/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          setExchangeFailure(messageForStatus(response.status));
          return;
        }

        const tokens = (await response.json()) as AuthTokens;
        completeLogin(tokens);
        router.replace("/");
      } catch {
        setExchangeFailure("네트워크 오류로 로그인에 실패했습니다.");
      }
    })();
  }, [code, state, immediateFailure, completeLogin, router]);

  const failure = immediateFailure ?? exchangeFailure;
  if (failure) {
    return (
      <div style={centerStyle}>
        <Result
          status="warning"
          title={failure}
          extra={
            <Button type="primary" onClick={() => router.replace("/login")}>
              로그인으로 돌아가기
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={centerStyle}>
      <Spin size="large" tip="로그인 중...">
        <div style={{ padding: 24 }} />
      </Spin>
    </div>
  );
}
