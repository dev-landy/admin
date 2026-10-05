"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { App, Button, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { useRecordActionScope } from "./RecordActionScope";

export type RowAction = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void | Promise<unknown>;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  confirm?: { title: ReactNode; description?: ReactNode; okText?: string };
};

type Divider = { type: "divider"; key?: string };

/** A stable primary action plus an explicitly labelled menu for secondary tasks. */
export function RowActions({ subject, primary, items, loading = false, disabled = false }: {
  subject: string;
  primary: ReactNode;
  items: readonly (RowAction | Divider)[];
  loading?: boolean;
  disabled?: boolean;
}) {
  const { modal } = App.useApp();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const confirmation = useRef<ReturnType<typeof modal.confirm> | null>(null);
  const scope = useRecordActionScope();
  const managed = Boolean(scope);
  useEffect(() => () => {
    if (!managed) confirmation.current?.destroy();
    confirmation.current = null;
  }, [subject, managed]);
  return <div className="admin-row-actions" onClick={(event) => event.stopPropagation()}>
    {primary}
    {items.length > 0 && <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      autoFocus
      disabled={disabled || loading}
      menu={{
        style: { maxHeight: "min(70vh, 400px)", overflowY: "auto" },
        items: items.filter((item, index) => !("type" in item) || (index > 0 && index < items.length - 1)).map((item, index) => "type" in item ? { type: "divider" as const, key: item.key ?? `divider-${index}` } : {
          key: item.key,
          label: item.href && !item.disabled ? <Link href={item.href}>{item.label}</Link> : item.label,
          icon: item.icon,
          danger: item.danger,
          disabled: item.disabled,
        }),
        onClick: ({ key, domEvent }) => {
          domEvent.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
          const item = items.find((candidate): candidate is RowAction => !("type" in candidate) && candidate.key === key);
          if (!item || item.disabled || disabled || loading) return;
          if (item.href) {
            const target = domEvent.target instanceof Element ? domEvent.target : null;
            // Menu keyboard activation and clicks on item padding target the
            // menuitem. Activate its real link so navigation guards still run.
            if (!target?.closest("a[href]")) {
              const link = target?.closest('[role="menuitem"]')?.querySelector<HTMLAnchorElement>("a[href]");
              link?.dispatchEvent(new MouseEvent("click", {
                bubbles: true, cancelable: true, view: window,
                ctrlKey: domEvent.ctrlKey, metaKey: domEvent.metaKey,
                shiftKey: domEvent.shiftKey, altKey: domEvent.altKey,
                button: "button" in domEvent ? domEvent.button : 0,
              }));
            }
            return;
          }
          if (item.confirm) {
            confirmation.current?.destroy();
            const okText = item.confirm.okText ?? (item.danger ? "삭제" : "확인");
            const dialog = modal.confirm({
              title: item.confirm.title,
              content: item.confirm.description,
              okText,
              cancelText: "취소",
              focusable: { autoFocusButton: "cancel" },
              mask: { closable: false },
              okButtonProps: { danger: item.danger, "aria-label": okText },
              onOk: async () => {
                dialog.update({ cancelButtonProps: { disabled: true }, okButtonProps: { danger: item.danger, "aria-label": okText, "aria-busy": true, disabled: true }, keyboard: false });
                try {
                  await item.onClick?.();
                } catch (error) {
                  dialog.update({ cancelButtonProps: { disabled: false }, okButtonProps: { danger: item.danger, "aria-label": okText, "aria-busy": false, disabled: false }, keyboard: true });
                  throw error;
                }
              },
            });
            confirmation.current = dialog;
            const release = scope?.register(scope.recordKey, dialog);
            // Await mode keeps rejected mutations in the dialog without an
            // unhandled rejection; each action owns its domain error feedback.
            void dialog.then(() => {
              release?.();
              if (confirmation.current === dialog) confirmation.current = null;
              // The initiating row may have become a card during the dialog.
              if (managed && !trigger.current) {
                Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-admin-action]")).find((button) => button.dataset.adminAction === subject)?.focus();
              }
            }, () => undefined);
          } else {
            void item.onClick?.();
          }
        },
      }}
    >
      <Button ref={trigger} size="small" className="admin-row-more" data-admin-action={subject} icon={<MoreOutlined />} aria-label={`${subject} 더보기`} aria-haspopup="menu" aria-expanded={open} loading={loading} disabled={disabled} />
    </Dropdown>}
  </div>;
}
