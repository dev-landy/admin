"use client";

import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef, useState } from "react";
import { Button, Card, Grid } from "antd";
import { DownOutlined, ReloadOutlined } from "@ant-design/icons";
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
  const screens = Grid.useBreakpoint();
  const isSplitView = screens.xl ?? true;
  const [open, setOpen] = useState(false);
  const [availableHeight, setAvailableHeight] = useState<number>();
  const expanded = isSplitView || open;
  const contentId = useId();
  const toggleRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const paneRef = useRef<HTMLElement>(null);
  const status = isLoading ? "불러오는 중" : hasError ? "원본 조회 실패" : pageCount === undefined ? "" : `${pageCount}페이지`;
  const refresh = onRefresh && <Button aria-label="원본 새로고침" icon={<ReloadOutlined />} loading={isRefreshing} onClick={onRefresh}>원본 새로고침</Button>;

  useLayoutEffect(() => {
    if (isSplitView || !open) return;
    const updateHeight = () => {
      if (!paneRef.current) return;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const actions = actionBarRef?.current?.getBoundingClientRect();
      const limit = actions && actions.height > 0 && actions.bottom > 0 && actions.top < bottom ? Math.min(bottom, actions.top) : bottom;
      setAvailableHeight(Math.max(0, limit - paneRef.current.getBoundingClientRect().bottom - 12));
    };
    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (actionBarRef?.current) observer.observe(actionBarRef.current);
    window.addEventListener("scroll", updateHeight, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleUpdate);
    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateHeight);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [actionBarRef, isSplitView, open]);

  return <section ref={paneRef} className={`${styles.pane} ${styles.sourcePane}`} aria-label="계약서 원본 영역" tabIndex={0}
    onBlurCapture={(event) => {
      // 원본 뒤에 가려진 입력란으로 키보드 포커스가 이동하면 원본을 접는다.
      if (!isSplitView && open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
      }
    }}
    onKeyDown={(event) => {
      if (!isSplitView && open && event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        toggleRef.current?.focus();
      }
    }}>
    <Card classNames={{ body: styles.sourceBody }}
      styles={{
        header: isSplitView ? undefined : { padding: 0 },
        title: isSplitView ? undefined : { overflow: "visible" },
        body: !expanded ? { display: "none" } : isSplitView ? undefined : { maxHeight: availableHeight },
      }}
      title={isSplitView ? "계약서 원본" : <Button ref={toggleRef} type="text" block
        style={{ height: 56, justifyContent: "space-between", fontSize: 16, fontWeight: 600, paddingInline: 24, borderRadius: 8 }}
        aria-label={`계약서 원본 ${expanded ? "접기" : "펼치기"}`} aria-expanded={expanded} aria-controls={contentId}
        onClick={() => setOpen((previous) => !previous)}>
        <span>계약서 원본</span>
        <span className={styles.sourceToggleDetail}>
          <span className={hasError ? styles.sourceErrorStatus : styles.sourceStatus}>{status}</span>
          <span>{expanded ? "접기" : "펼치기"}</span><DownOutlined rotate={expanded ? 180 : 0} />
        </span>
      </Button>}
      extra={isSplitView ? refresh : undefined}>
      <div id={contentId} hidden={!expanded} tabIndex={isSplitView ? undefined : 0} aria-label="계약서 원본 내용">
        {!isSplitView && refresh && <div className={styles.sourceRefresh}>{refresh}</div>}
        {children}
      </div>
    </Card>
  </section>;
}
