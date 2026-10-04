"use client";

import { type ComponentProps, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Modal, Spin } from "antd";
import { DeferredContentBoundary, DeferredContentError, ReloadPageButton } from "@/components/DeferredContentBoundary";

const PropertyEditModal = dynamic(() => import("./PropertyEditModal").then((module) => module.PropertyEditModal));
const PropertyTenantsModal = dynamic(() => import("./PropertyTenantsModal").then((module) => module.PropertyTenantsModal));

function useDeferredOverlay(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  const isOpen = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && !isOpen.current) trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    isOpen.current = open;
  }, [open]);
  const restoreFocus = useCallback(() => {
    if (!isOpen.current && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  }, []);
  return { activated: open || hasOpened, restoreFocus };
}

function LoadingModal({ open, title, onClose, restoreFocus }: { open: boolean; title: string; onClose: () => void; restoreFocus: () => void }) {
  // A cancelled fallback may unmount when its chunk arrives, before its leave
  // motion finishes. Restoring here is harmless while the real dialog is open.
  useEffect(() => () => restoreFocus(), [restoreFocus]);
  return <Modal open={open} title={title} onCancel={onClose} focusable={{ focusTriggerAfterClose: false }} afterClose={restoreFocus} footer={<Button onClick={onClose}>취소</Button>}>
    <div role="status" aria-live="polite" aria-busy="true" style={{ padding: 24, textAlign: "center" }}>
      <Spin />
      <p>화면을 불러오는 중입니다.</p>
    </div>
  </Modal>;
}

function FailedModal({ open, title, onClose, restoreFocus }: { open: boolean; title: string; onClose: () => void; restoreFocus: () => void }) {
  useEffect(() => () => restoreFocus(), [restoreFocus]);
  return <Modal open={open} title={title} onCancel={onClose} focusable={{ focusTriggerAfterClose: false }} afterClose={restoreFocus}
    footer={<><Button onClick={onClose}>취소</Button><ReloadPageButton /></>}>
    <DeferredContentError title="화면을 불러오지 못했습니다." showReload={false} />
  </Modal>;
}

export function DeferredPropertyEditModal(props: ComponentProps<typeof PropertyEditModal>) {
  const { activated, restoreFocus } = useDeferredOverlay(props.property !== null);
  if (!activated) return null;
  return <DeferredContentBoundary fallback={<FailedModal open={props.property !== null} title="건물 수정" onClose={props.onClose} restoreFocus={restoreFocus} />}>
    <Suspense fallback={<LoadingModal open={props.property !== null} title="건물 수정" onClose={props.onClose} restoreFocus={restoreFocus} />}>
      <PropertyEditModal {...props} focusable={{ ...props.focusable, focusTriggerAfterClose: false }} afterClose={() => { restoreFocus(); props.afterClose?.(); }} />
    </Suspense>
  </DeferredContentBoundary>;
}

export function DeferredPropertyTenantsModal(props: ComponentProps<typeof PropertyTenantsModal>) {
  const { activated, restoreFocus } = useDeferredOverlay(props.propertyId !== null);
  if (!activated) return null;
  return <DeferredContentBoundary fallback={<FailedModal open={props.propertyId !== null} title={`${props.propertyName ?? "건물"} 소속 임차인`} onClose={props.onClose} restoreFocus={restoreFocus} />}>
    <Suspense fallback={<LoadingModal open={props.propertyId !== null} title={`${props.propertyName ?? "건물"} 소속 임차인`} onClose={props.onClose} restoreFocus={restoreFocus} />}>
      <PropertyTenantsModal {...props} focusable={{ ...props.focusable, focusTriggerAfterClose: false }} afterClose={() => { restoreFocus(); props.afterClose?.(); }} />
    </Suspense>
  </DeferredContentBoundary>;
}
