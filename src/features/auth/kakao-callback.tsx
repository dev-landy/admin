"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Result, Spin } from "antd";

import { useAuth } from "./context";
import { KAKAO_CALLBACK_TIMEOUT_MS } from "./kakao.constants";
import type { AuthTokens } from "./types";

type KakaoCallbackProps = {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

const centerStyle = {
  display: "flex",
  minHeight: "100dvh",
  padding: 20,
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
  const immediateFailure = resolveImmediateFailure(props);
  const [initialRequest] = useState(() => ({ code, state, immediateFailure }));
  const [requestChanged, setRequestChanged] = useState(false);
  if (!requestChanged && (code !== initialRequest.code || state !== initialRequest.state || immediateFailure !== initialRequest.immediateFailure)) {
    setRequestChanged(true);
  }
  const [exchangeFailure, setExchangeFailure] = useState<string | null>(null);
  // Guard against React StrictMode double-invoke: the code + state cookie are
  // single-use, so the exchange must run exactly once.
  const startedRef = useRef(false);
  const mountedRef = useRef(false);
  const latestIdentityRef = useRef<{ code?: string; state?: string; immediateFailure: string | null }>(null);

  // Revoke the old result before a newly committed callback can paint.
  useLayoutEffect(() => {
    const previousIdentity = latestIdentityRef.current;
    const identity = previousIdentity?.code === code && previousIdentity?.state === state && previousIdentity?.immediateFailure === immediateFailure
      ? previousIdentity
      : { code, state, immediateFailure };
    latestIdentityRef.current = identity;
  }, [code, state, immediateFailure]);

  useEffect(() => {
    mountedRef.current = true;
    const identity = latestIdentityRef.current;
    const isCurrent = () => mountedRef.current && latestIdentityRef.current === identity;
    if (immediateFailure || requestChanged || startedRef.current) {
      return () => { mountedRef.current = false; };
    }
    startedRef.current = true;

    void (async () => {
      const controller = new AbortController();
      const timeoutMessage = "로그인 응답이 지연되고 있습니다. 로그인으로 돌아가 새로 시도해주세요.";
      const timeout = setTimeout(() => {
        controller.abort();
        if (isCurrent()) setExchangeFailure(timeoutMessage);
      }, KAKAO_CALLBACK_TIMEOUT_MS);
      try {
        const response = await fetch("/auth/kakao/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
          signal: controller.signal,
        });

        if (!isCurrent() || controller.signal.aborted) return;

        if (!response.ok) {
          setExchangeFailure(messageForStatus(response.status));
          return;
        }

        const tokens = (await response.json()) as AuthTokens;
        if (!isCurrent() || controller.signal.aborted) return;
        completeLogin(tokens);
        router.replace("/");
      } catch {
        if (isCurrent()) {
          setExchangeFailure(controller.signal.aborted ? timeoutMessage : "네트워크 오류로 로그인에 실패했습니다.");
        }
      } finally {
        clearTimeout(timeout);
      }
    })();
    // The code is single-use. StrictMode cleanup must not cancel and restart it.
    return () => { mountedRef.current = false; };
  }, [code, state, immediateFailure, requestChanged, completeLogin, router]);

  const failure = immediateFailure ?? (requestChanged
    ? "로그인 요청이 변경되었습니다. 로그인으로 돌아가 새로 시도해주세요."
    : exchangeFailure);
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
      <Spin size="large" aria-label="카카오 로그인 중" description="로그인 중...">
        <div style={{ padding: 24 }} />
      </Spin>
    </div>
  );
}
