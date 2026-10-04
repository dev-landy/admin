"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "antd";

type Props = Omit<ComponentProps<typeof Button>, "href"> & { href: string };

/** AntD's anchor styling with client navigation and native new-tab behavior. */
export function ClientLinkButton({ href, onClick, ...props }: Props) {
  const router = useRouter();

  return <Button {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.currentTarget;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    // The document capture listener in NavigationGuard has already checked this
    // anchor. Rechecking here would ask twice when the user approves leaving.
    event.preventDefault();
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }} />;
}
