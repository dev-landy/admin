"use client";

import { Component, type ReactNode } from "react";
import { Alert, Button } from "antd";

export class DeferredContentBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ReloadPageButton() {
  // Native document reload also runs the existing beforeunload draft guard.
  return <Button onClick={() => window.location.reload()}>페이지 새로고침</Button>;
}

export function DeferredContentError({ title = "목록 화면을 불러오지 못했습니다.", showReload = true }: { title?: string; showReload?: boolean }) {
  return <Alert type="error" showIcon title={title}
    description="연결을 확인한 뒤 페이지를 새로고침해 주세요."
    action={showReload ? <ReloadPageButton /> : undefined} />;
}
