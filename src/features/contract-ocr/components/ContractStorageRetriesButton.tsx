"use client";

import { useRef } from "react";
import { App, Button } from "antd";
import { useRetryContractStorage } from "../hooks";
import { parseProblemDetail } from "@/lib/api/problem";

export function ContractStorageRetriesButton() {
  const { modal, notification } = App.useApp();
  const retryMutation = useRetryContractStorage();
  const confirmationOpen = useRef(false);
  const requestInProgress = useRef(false);

  function confirmRetry() {
    if (confirmationOpen.current || requestInProgress.current) return;
    confirmationOpen.current = true;
    modal.confirm({
      title: "미완료 계약서 작업을 재처리할까요?",
      content: "전체 계약서의 보관·삭제 등 미완료 파일 작업을 다시 시도하고, 이전 처리 흐름의 임차인 등록과 결과 알림을 이어서 처리합니다. 일부 작업이 실패해도 다른 작업은 처리될 수 있습니다. OCR 분석을 새로 요청하지 않습니다.",
      okText: "재처리",
      cancelText: "취소",
      afterClose: () => { confirmationOpen.current = false; },
      onOk: async () => {
        if (requestInProgress.current) return;
        requestInProgress.current = true;
        try {
          const result = await retryMutation.mutateAsync();
          notification.success({
            title: "미완료 작업 재처리를 요청했습니다.",
            description: `시도한 파일 작업: ${result.attempted}건. 실패한 시도도 포함되며, 0건이어도 다른 미완료 작업이 모두 정리됐다는 뜻은 아닙니다.`,
          });
        } catch (error) {
          const detail = parseProblemDetail(error)?.detail;
          notification.error({
            title: "재처리 결과를 확인하지 못했습니다.",
            description: `${detail ? `${detail} ` : ""}일부 작업은 이미 처리됐을 수 있습니다. 목록과 처리 상태를 확인한 뒤 다시 요청해 주세요.`,
          });
        } finally {
          requestInProgress.current = false;
        }
      },
    });
  }

  return <Button aria-label="계약서 처리 복구" loading={retryMutation.isPending} disabled={retryMutation.isPending} onClick={confirmRetry}>
    계약서 처리 복구
  </Button>;
}
