"use client";

import { type ReactNode, type Ref, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Grid } from "antd";
import styles from "./ContractDocumentReview.module.css";

const TEXT_INPUT_TYPES = new Set(["text", "search", "tel", "url", "email", "password", "number"]);

function isEditableText(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) {
    return !target.disabled && !target.readOnly && TEXT_INPUT_TYPES.has(target.type);
  }
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  if (!(target instanceof HTMLElement)) return false;
  const editable = target.closest("[contenteditable]")?.getAttribute("contenteditable")?.toLowerCase();
  return target.isContentEditable || editable === "" || editable === "true" || editable === "plaintext-only";
}

export function ContractDocumentActions({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  const isSplitView = Grid.useBreakpoint().xl ?? true;
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionPointerDown = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  useImperativeHandle(ref, () => actionsRef.current!, []);

  useLayoutEffect(() => {
    if (isSplitView) return;
    const updateEditing = (event?: FocusEvent) => {
      if (actionPointerDown.current) return;
      const target = event?.type === "focusout" ? event.relatedTarget : document.activeElement;
      // 입력창에서 등록·반려 버튼으로 이동할 때 위치를 바꾸면 진행 중인 클릭을 놓칠 수 있다.
      if (target instanceof Node && actionsRef.current?.contains(target)) return;
      setIsEditing(isEditableText(target));
    };
    const releasePointer = () => { actionPointerDown.current = false; };
    updateEditing();
    document.addEventListener("focusin", updateEditing);
    document.addEventListener("focusout", updateEditing);
    document.addEventListener("pointerup", releasePointer);
    document.addEventListener("pointercancel", releasePointer);
    return () => {
      releasePointer();
      document.removeEventListener("focusin", updateEditing);
      document.removeEventListener("focusout", updateEditing);
      document.removeEventListener("pointerup", releasePointer);
      document.removeEventListener("pointercancel", releasePointer);
    };
  }, [isSplitView]);

  return <div ref={actionsRef} className={styles.actions} style={{ position: !isSplitView && isEditing ? "static" : undefined }}
    onPointerDownCapture={() => { if (!isSplitView) actionPointerDown.current = true; }}>
    {children}
  </div>;
}
