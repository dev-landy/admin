"use client";

import { useState } from "react";
import { Alert, Button, Image } from "antd";

import type { ContractDocumentFile } from "../types";

export function ContractDocumentSourceImage({ file, isRefreshing, onRefresh }: {
  file: ContractDocumentFile;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const page = file.fileIndex + 1;

  if (failed) {
    return <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      title={`계약서 ${page}페이지를 표시할 수 없습니다.`}
      description="브라우저에서 원본을 불러오지 못했습니다. 원본 새로고침으로 다시 시도해 주세요."
      action={<Button aria-label={`계약서 ${page}페이지 원본 새로고침`} loading={isRefreshing} disabled={isRefreshing} onClick={onRefresh}>원본 새로고침</Button>} />;
  }

  return <Image preview={false} width="100%" src={file.url} alt={`계약서 ${page}페이지`}
    onError={() => setFailed(true)} style={{ marginBottom: 12 }} />;
}
