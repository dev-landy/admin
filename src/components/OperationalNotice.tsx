"use client";

import { useState, type ReactNode } from "react";
import { useAdminViewport, type AdminViewport } from "./useAdminViewport";

export function OperationalNotice({ title, children }: { title: string; children: ReactNode }) {
  const viewport = useAdminViewport();
  const [choice, setChoice] = useState<{ viewport: AdminViewport; open: boolean }>();
  const open = choice?.viewport === viewport ? choice.open : viewport === "wide";
  return <details className="admin-operation-notice" open={open} onToggle={(event) => setChoice({ viewport, open: event.currentTarget.open })}>
    <summary>{title}<span>{open ? "접기" : "자세히"}</span></summary>
    <div>{children}</div>
  </details>;
}
