"use client";

import { RefreshButton } from "@/components/RefreshButton";

import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef, useState } from "react";
import { Button, Card, Drawer, Grid } from "antd";
import { FileImageOutlined, FormOutlined } from "@ant-design/icons";
import styles from "./ContractDocumentReview.module.css";

export function ContractDocumentSourcePanel({ children, pageCount, isLoading, hasError, onRefresh, isRefreshing, actionBarRef }: {
  children: ReactNode;
  pageCount?: number;
  isLoading?: boolean;
  hasError?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actionBarRef?: RefObject<HTMLDivElement | null>;
}) {
  const isSplitView = Grid.useBreakpoint().xl ?? true;
  const [reader, setReader] = useState(() => ({ isSplitView, open: false }));
  if (reader.isSplitView !== isSplitView) setReader({ isSplitView, open: false });
  const open = reader.isSplitView === isSplitView && reader.open;
  const setOpen = (nextOpen: boolean) => setReader({ isSplitView, open: nextOpen });
  const [bottom, setBottom] = useState(16);
  const contentId = useId();
  const toggleRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const triggerPointerDown = useRef(false);
  const status = isLoading ? "불러오는 중" : hasError ? "원본 조회 실패" : pageCount === undefined ? "" : `${pageCount}페이지`;
  const refresh = onRefresh && <RefreshButton aria-label="원본 새로고침" title="원본 새로고침"
    className={isSplitView ? undefined : styles.sourceRefreshIcon}
    loading={isRefreshing} disabled={isRefreshing} onClick={onRefresh}>{isSplitView ? "원본 새로고침" : null}</RefreshButton>;

  useLayoutEffect(() => {
    if (isSplitView) return;
    let observedActions: HTMLElement | null = null;
    const updatePosition = () => {
      if (triggerPointerDown.current) return;
      const currentActions = actionBarRef?.current ?? null;
      if (currentActions !== observedActions) {
        if (observedActions) observer.unobserve(observedActions);
        observedActions = currentActions;
        if (observedActions) observer.observe(observedActions);
      }
      const actions = actionBarRef?.current?.getBoundingClientRect();
      // 실제 화면 하단에 보이는 등록 영역만 피한다. 키보드 높이를 더해 끌어올리지 않는다.
      const overlaps = actions && actions.height > 0 && actions.top < window.innerHeight && actions.bottom > window.innerHeight - 76;
      setBottom(overlaps ? Math.max(16, window.innerHeight - actions.top + 12) : 16);
    };
    let frame: number | undefined;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };
    const releasePointer = () => {
      if (releaseTimer !== undefined) clearTimeout(releaseTimer);
      // pointerup과 click 사이에 FAB가 움직이면 터치가 취소될 수 있다.
      releaseTimer = setTimeout(() => {
        triggerPointerDown.current = false;
        updatePosition();
      }, 0);
    };
    const observer = new ResizeObserver(updatePosition);
    updatePosition();
    // 앞쪽 원본 패널의 layout effect 이후에 액션 영역의 전달 ref가 준비될 수 있다.
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("focusin", scheduleUpdate);
    document.addEventListener("focusout", scheduleUpdate);
    document.addEventListener("pointerup", releasePointer);
    document.addEventListener("pointercancel", releasePointer);
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (releaseTimer !== undefined) clearTimeout(releaseTimer);
      triggerPointerDown.current = false;
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("focusin", scheduleUpdate);
      document.removeEventListener("focusout", scheduleUpdate);
      document.removeEventListener("pointerup", releasePointer);
      document.removeEventListener("pointercancel", releasePointer);
    };
  }, [actionBarRef, isSplitView]);

  if (isSplitView) return <section className={`${styles.pane} ${styles.sourcePane}`} aria-label="계약서 원본 영역" tabIndex={0}>
    <Card title="계약서 원본" extra={refresh}>
      <div id={contentId} aria-label="계약서 원본 내용">
        {children}
      </div>
    </Card>
  </section>;

  return <section className={`${styles.pane} ${styles.sourcePane}`} aria-label="계약서 원본 영역"
    style={{ bottom: `max(${bottom}px, env(safe-area-inset-bottom, 0px))` }}>
    <Button ref={toggleRef} type="primary" size="large" shape="round" className={styles.sourceTrigger}
      icon={<FileImageOutlined aria-hidden="true" />} aria-label="계약서 원본 펼치기" aria-expanded={open} aria-controls={contentId}
      aria-busy={isLoading || undefined} title={status || undefined} danger={hasError}
      onPointerDownCapture={() => { triggerPointerDown.current = true; }}
      onClick={() => { triggerPointerDown.current = false; setOpen(true); }}>
      계약서 원본
    </Button>
    <Drawer title={<span className={styles.sourceDrawerTitle}>계약서 원본
      {status && <span className={hasError ? styles.sourceErrorStatus : styles.sourceStatus}>{status}</span>}
    </span>} placement="left" size="min(720px, calc(100vw - 24px))" open={open} onClose={() => setOpen(false)}
      closable={{ "aria-label": "계약서 원본 닫기" }}
      extra={refresh} forceRender focusable={{ focusTriggerAfterClose: false }}
      footer={<Button type="primary" size="large" shape="round" icon={<FormOutlined aria-hidden="true" />} className={styles.sourceReturnButton}
        style={{ position: "absolute" }}
        onClick={() => setOpen(false)}>입력으로 돌아가기</Button>}
      classNames={{ header: styles.sourceDrawerHeader, body: styles.sourceDrawerBody }}
      styles={{ header: { padding: "8px 12px" }, body: { padding: "12px 16px", paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" },
        close: { width: 44, height: 44, margin: 0 }, footer: { position: "relative", height: 0, padding: 0, border: 0 } }}
      afterOpenChange={(visible) => { if (!visible) toggleRef.current?.focus({ preventScroll: true }); }}>
      <div id={contentId} aria-label="계약서 원본 내용">{children}</div>
    </Drawer>
  </section>;
}
