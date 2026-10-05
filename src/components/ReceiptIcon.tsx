import Icon from "@ant-design/icons";
import type { ComponentProps } from "react";

function ReceiptMark() {
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
    <path d="M3 3h18v18l-3-2-3 2-3-2-3 2-3-2-3 2V3Z" />
    <path d="M7 7h10M7 11h10M7 15h6" />
  </svg>;
}

/** Receipt silhouette for recorded payments, using the menu's icon sizing. */
export function ReceiptIcon(props: ComponentProps<typeof Icon>) {
  return <Icon {...props} component={ReceiptMark} aria-hidden="true" />;
}
