"use client";

import { useEffect, useRef, useState } from "react";
import { App } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";

type Attempt = { cancelled: boolean; dismiss?: () => void };

function isContractOverlap(error: unknown): boolean {
  const problem = parseProblemDetail(error);
  return problem?.status === 409 && problem.type === "/problems/tenant-room-number-duplicated";
}

// 승인은 이번 저장 요청에만 적용한다. 다른 문서·임차인 또는 다음 저장에 재사용하지 않는다.
export function useContractOverlapConfirmation(scope: string) {
  const { modal } = App.useApp();
  const attemptRef = useRef<Attempt | null>(null);
  const [progress, setProgress] = useState({ scope, busy: false });

  useEffect(() => () => {
    const attempt = attemptRef.current;
    if (attempt) {
      attempt.cancelled = true;
      attempt.dismiss?.();
      attemptRef.current = null;
    }
  }, [scope]);

  async function submit<T extends { allowContractOverlap?: boolean }>(
    request: T,
    save: (request: T) => Promise<unknown>,
    action: "등록" | "수정",
  ): Promise<boolean> {
    if (attemptRef.current) return false;
    const attempt: Attempt = { cancelled: false };
    attemptRef.current = attempt;
    setProgress({ scope, busy: true });
    const snapshot = { ...request };
    delete snapshot.allowContractOverlap;
    try {
      try {
        await save(snapshot);
      } catch (error) {
        if (attempt.cancelled) return false;
        if (!isContractOverlap(error)) throw error;
        const confirmed = await new Promise<boolean>((resolve) => {
          const dialog = modal.confirm({
            title: "계약 기간이 겹칩니다",
            content: `같은 호실의 기존 계약과 계약 기간이 겹칩니다. 입력한 기간을 확인해 주세요. 기간을 그대로 유지하고 ${action}하시겠어요?`,
            okText: `겹쳐도 ${action}`,
            cancelText: "취소",
            mask: { closable: false },
            focusable: { autoFocusButton: "cancel" },
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
            afterClose: () => resolve(false),
          });
          attempt.dismiss = () => { resolve(false); dialog.destroy(); };
        });
        attempt.dismiss = undefined;
        if (!confirmed || attempt.cancelled) return false;
        // 승인한 스냅샷으로 한 번만 재시도한다. 재시도 오류는 확인창을 다시 띄우지 않는다.
        await save({ ...snapshot, allowContractOverlap: true });
      }
      return !attempt.cancelled;
    } catch (error) {
      if (attempt.cancelled) return false;
      throw error;
    } finally {
      if (attemptRef.current === attempt) {
        attemptRef.current = null;
        setProgress({ scope, busy: false });
      }
    }
  }

  return { submit, isSubmitting: progress.scope === scope && progress.busy };
}
