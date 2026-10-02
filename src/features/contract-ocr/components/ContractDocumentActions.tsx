"use client";

import { type ReactNode, type Ref, useLayoutEffect, useState } from "react";
import { Grid } from "antd";
import styles from "./ContractDocumentReview.module.css";

export function ContractDocumentActions({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  const screens = Grid.useBreakpoint();
  const isSplitView = screens.xl ?? true;
  const [bottomInset, setBottomInset] = useState(0);

  useLayoutEffect(() => {
    if (isSplitView || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const updateInset = () => setBottomInset(Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height));
    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
    };
  }, [isSplitView]);

  return <div ref={ref} className={styles.actions} style={{ bottom: isSplitView ? undefined : bottomInset }}>
    {children}
  </div>;
}
