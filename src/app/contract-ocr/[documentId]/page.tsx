import { redirect } from "next/navigation";

/** 이미 발송된 Slack 검수 링크는 UI를 복제하지 않고 현재 상세로 이동한다. */
export default async function LegacyContractReviewPage({ params, searchParams }: {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { documentId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, key === "returnTo" ? item.replace(/^\/contract-ocr(?=\?|$)/, "/contract-documents") : item);
    }
  }
  redirect(`/contract-documents/${encodeURIComponent(documentId)}${query.size ? `?${query}` : ""}`);
}
