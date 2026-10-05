"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { detailReturnPath } from "@/lib/navigation/listReturn";

function RelatedPageBackContent() {
  const value = useSearchParams().get("returnTo");
  return value ? <ClientLinkButton href={detailReturnPath(value, "/users")}>이전 화면으로</ClientLinkButton> : null;
}

export function RelatedPageBack() {
  return <Suspense fallback={null}><RelatedPageBackContent /></Suspense>;
}
