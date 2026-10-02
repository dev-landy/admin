"use client";

import { useRef, useState } from "react";
import { Alert, Button, Card, Space } from "antd";
import { findNextPendingContract, contractReviewPath } from "../navigation";
import { parseProblemDetail } from "@/lib/api/problem";

export function ContractDocumentCompletion({ status, documentId, returnPath, position, onNavigate, onBack }: {
  status: "REGISTERED" | "REJECTED";
  documentId: string;
  returnPath: string;
  position: number;
  onNavigate: (path: string) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const inProgress = useRef(false);
  async function continueReview() {
    if (inProgress.current) return;
    inProgress.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const next = await findNextPendingContract(documentId, returnPath, position);
      onNavigate(next.document ? contractReviewPath(next.document.documentId, next.returnPath, next.position) : next.returnPath);
    } catch (error) {
      setError(parseProblemDetail(error)?.detail ?? (error instanceof Error ? error.message : "다음 계약서 목록을 불러오지 못했습니다."));
    } finally {
      inProgress.current = false;
      setLoading(false);
    }
  }
  return <Card title="계약서 처리 완료">
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Alert type="success" showIcon title={status === "REGISTERED" ? "임차인 등록이 완료되었습니다." : "계약서를 반려했습니다."}
        description="대기 목록을 다시 확인해 남은 계약서를 검수할 수 있습니다. 대기 계약서가 없으면 목록으로 돌아갑니다." />
      {error && <Alert type="warning" showIcon title="처리는 완료되었습니다 · 다음 계약서 조회 실패" description={error} />}
      <Space wrap>
        <Button type="primary" autoFocus loading={loading} onClick={continueReview}>{error ? "다음 계약서 다시 조회" : "다음 계약서 검수"}</Button>
        <Button onClick={onBack} disabled={loading}>목록으로</Button>
      </Space>
    </Space>
  </Card>;
}
