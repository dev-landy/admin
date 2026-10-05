"use client";

import { RefreshButton } from "@/components/RefreshButton";

import { useState } from "react";
import { Alert, Button, Image } from "antd";

import styles from "./ContractDocumentSourceImage.module.css";
import type { ContractDocumentFile } from "../types";

export function ContractDocumentSourceImage({ file, isRefreshing, onRefresh }: {
  file: ContractDocumentFile;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const page = file.fileIndex + 1;

  if (failed) {
    return <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      title={`계약서 ${page}페이지를 표시할 수 없습니다.`}
      description="브라우저에서 원본을 불러오지 못했습니다. 원본 새로고침으로 다시 시도해 주세요."
      action={<RefreshButton aria-label={`계약서 ${page}페이지 원본 새로고침`} loading={isRefreshing} disabled={isRefreshing} onClick={onRefresh}>원본 새로고침</RefreshButton>} />;
  }

  return <div>
    <div className={styles.toolbar} role="group" aria-label={`계약서 ${page}페이지 확대 조절`}>
      <Button aria-label={`계약서 ${page}페이지 축소`} disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))}>축소</Button>
      <span aria-live="polite" aria-label={`계약서 ${page}페이지 확대 비율`}>{zoom}%</span>
      <Button aria-label={`계약서 ${page}페이지 확대`} disabled={zoom >= 250} onClick={() => setZoom((value) => Math.min(250, value + 25))}>확대</Button>
      <Button aria-label={`계약서 ${page}페이지 기본 크기`} disabled={zoom === 100} onClick={() => setZoom(100)}>기본 크기</Button>
    </div>
    <div className={styles.imageViewport} tabIndex={0} role="region" aria-label={`계약서 ${page}페이지 확대 원본`}>
      <div style={{ width: `${zoom}%` }}><Image preview={false} width="100%" src={file.url} alt={`계약서 ${page}페이지`} onError={() => setFailed(true)} /></div>
    </div>
  </div>;
}
