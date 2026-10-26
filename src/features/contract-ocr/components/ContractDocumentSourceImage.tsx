"use client";

import { RefreshButton } from "@/components/RefreshButton";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Alert, Button, Grid, Image } from "antd";

import styles from "./ContractDocumentSourceImage.module.css";
import type { ContractDocumentFile } from "../types";

type ZoomAnchor = {
  zoom: number;
  x: number;
  y: number;
  left: number;
  top: number;
  scroller: HTMLElement | null;
};

function verticalScroller(viewport: HTMLElement): HTMLElement | null {
  for (let parent = viewport.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

export function ContractDocumentSourceImage({ file, isRefreshing, onRefresh }: {
  file: ContractDocumentFile;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const isSplitView = Grid.useBreakpoint().xl ?? true;
  const zoomDescriptionId = useId();
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(100);
  const renderedZoomRef = useRef(100);
  const anchorRef = useRef<ZoomAnchor | null>(null);
  const pointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const page = file.fileIndex + 1;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = anchorRef.current;
    if (viewport && anchor) {
      const ratio = zoom / anchor.zoom;
      viewport.scrollLeft = (anchor.left + anchor.x) * ratio - anchor.x;
      if (anchor.scroller) anchor.scroller.scrollTop = anchor.top + anchor.y * (ratio - 1);
    }
    anchorRef.current = null;
    zoomRef.current = zoom;
    renderedZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || failed) return;
    let gestureStartZoom: number | null = null;

    function zoomAt(next: number, pointer = pointerRef.current) {
      if (!viewport || !Number.isFinite(next)) return;
      const bounded = Math.min(250, Math.max(50, Math.round(next * 100) / 100));
      if (bounded === zoomRef.current) return;
      const rect = viewport.getBoundingClientRect();
      const scroller = verticalScroller(viewport);
      anchorRef.current = {
        zoom: renderedZoomRef.current,
        x: pointer ? pointer.clientX - rect.left : rect.width / 2,
        y: pointer ? pointer.clientY - rect.top : rect.height / 2,
        left: viewport.scrollLeft,
        top: scroller?.scrollTop ?? 0,
        scroller,
      };
      zoomRef.current = bounded;
      setZoom(bounded);
    }

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      // React의 passive wheel handler 대신 원본 영역에서만 브라우저 확대를 막는다.
      event.preventDefault();
      if (gestureStartZoom !== null) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport!.clientHeight : 1;
      zoomAt(zoomRef.current * Math.exp(-event.deltaY * unit / 100), event);
    }

    // Safari는 누적 배율을 gesturechange로 전달한다. wheel과 동시에 처리하지 않는다.
    function onGestureStart(event: Event) {
      event.preventDefault();
      gestureStartZoom = zoomRef.current;
    }
    function onGestureChange(event: Event) {
      if (gestureStartZoom === null) return;
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (typeof scale === "number" && scale > 0) zoomAt(gestureStartZoom * scale);
    }
    function onGestureEnd(event: Event) {
      if (gestureStartZoom === null) return;
      event.preventDefault();
      gestureStartZoom = null;
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("gesturestart", onGestureStart, { passive: false });
    viewport.addEventListener("gesturechange", onGestureChange, { passive: false });
    viewport.addEventListener("gestureend", onGestureEnd, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("gesturestart", onGestureStart);
      viewport.removeEventListener("gesturechange", onGestureChange);
      viewport.removeEventListener("gestureend", onGestureEnd);
    };
  }, [failed]);

  if (failed) {
    return <Alert type="warning" showIcon style={{ marginBottom: 12 }}
      title={`계약서 ${page}페이지를 표시할 수 없습니다.`}
      description="브라우저에서 원본을 불러오지 못했습니다. 원본 새로고침으로 다시 시도해 주세요."
      action={<RefreshButton aria-label={`계약서 ${page}페이지 원본 새로고침`} loading={isRefreshing} disabled={isRefreshing} onClick={onRefresh}>원본 새로고침</RefreshButton>} />;
  }

  return <div>
    {isSplitView && <div className={styles.toolbar} role="group" aria-label={`계약서 ${page}페이지 확대 조절`}>
      <Button aria-label={`계약서 ${page}페이지 축소`} disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))}>축소</Button>
      <span aria-live="polite" aria-label={`계약서 ${page}페이지 확대 비율`}>{Math.round(zoom)}%</span>
      <Button aria-label={`계약서 ${page}페이지 확대`} disabled={zoom >= 250} onClick={() => setZoom((value) => Math.min(250, value + 25))}>확대</Button>
      <Button aria-label={`계약서 ${page}페이지 기본 크기`} disabled={zoom === 100} onClick={() => setZoom(100)}>기본 크기</Button>
    </div>}
    <span id={zoomDescriptionId} className="admin-visually-hidden">핀치로 확대·축소하거나 +, -, 0 키를 사용할 수 있습니다.</span>
    <div ref={viewportRef} className={styles.imageViewport} tabIndex={0} role="region" aria-label={`계약서 ${page}페이지 확대 원본`}
      aria-describedby={zoomDescriptionId}
      onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          setZoom((value) => Math.min(250, value + 25));
        } else if (event.key === "-") {
          event.preventDefault();
          setZoom((value) => Math.max(50, value - 25));
        } else if (event.key === "0") {
          event.preventDefault();
          setZoom(100);
        }
      }}
      onPointerMove={(event) => { pointerRef.current = { clientX: event.clientX, clientY: event.clientY }; }}>
      <div style={{ width: `${zoom}%` }}><Image preview={false} width="100%" src={file.url} alt={`계약서 ${page}페이지`} onError={() => setFailed(true)} /></div>
    </div>
  </div>;
}
