"use client";

import { Alert, Button } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";

type Props = {
  error: unknown;
  onRetry: () => unknown;
  isRetrying?: boolean;
  hasData?: boolean;
  title?: string;
};

export function QueryErrorAlert({ error, onRetry, isRetrying = false, hasData = false, title = "정보를 불러오지 못했습니다." }: Props) {
  if (!error) return null;
  const problem = parseProblemDetail(error);
  return (
    <Alert
      type="error"
      showIcon
      title={title}
      description={<>
        {problem?.detail && <div>{problem.detail}</div>}
        <div>{hasData ? "마지막으로 조회한 정보를 표시하고 있습니다. 다시 조회해 주세요." : "잠시 후 다시 조회해 주세요."}</div>
      </>}
      action={<Button size="small" loading={isRetrying} disabled={isRetrying} onClick={() => { void onRetry(); }}>다시 조회</Button>}
      style={{ marginBottom: 16 }}
    />
  );
}
