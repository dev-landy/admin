import { redirect } from "next/navigation";

/** 이미 발송된 Slack 링크는 현재 계약서 목록으로 이동한다. */
export default async function LegacyContractListPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  redirect(`/contract-documents${query.size ? `?${query}` : ""}`);
}
