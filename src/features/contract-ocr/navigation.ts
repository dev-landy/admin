import { fetchContractDocuments } from "./api";
import { optionalPositiveInteger, optionalDate } from "@/lib/navigation/listParams";
import type { ContractDocument, ContractDocumentListFilters } from "./types";

const LIST_PATH = "/contract-documents";
function positiveInteger(value: string | null, fallback: number, max: number) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? number : fallback;
}

// returnTo is user-controlled. Only the known list route is a valid return destination.
export function contractListReturnPath(value: string | null | undefined, fromCompleted = false) {
  const fallback = fromCompleted ? `${LIST_PATH}?status=completed` : LIST_PATH;
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || url.pathname !== LIST_PATH) return fallback;
    if (url.searchParams.has("page")) url.searchParams.set("page", String(positiveInteger(url.searchParams.get("page"), 1, 1_000_000)));
    if (url.searchParams.has("size")) url.searchParams.set("size", String(positiveInteger(url.searchParams.get("size"), 20, 100)));
    if (url.searchParams.has("status") && url.searchParams.get("status") !== "completed") url.searchParams.delete("status");
    return `${LIST_PATH}${url.search}`;
  } catch { return fallback; }
}

export function contractReviewPath(documentId: string, returnPath: string, position = 0) {
  const params = new URLSearchParams({ returnTo: contractListReturnPath(returnPath), position: String(Math.max(0, position)) });
  return `${LIST_PATH}/${encodeURIComponent(documentId)}?${params.toString()}`;
}

export function contractReviewPosition(value: string | null, size: number) {
  const position = Number(value);
  return Number.isSafeInteger(position) && position >= 0 && position < size ? position : 0;
}

/** 연속 검수도 사용자가 좁힌 대기열 안에서 다음 문서를 찾는다. */
export function contractListFilters(params: URLSearchParams): ContractDocumentListFilters {
  const documentStatus = params.get("documentStatus");
  const uploadId = params.get("uploadId");
  return {
    userId: optionalPositiveInteger(params.get("userId")),
    propertyId: optionalPositiveInteger(params.get("propertyId")),
    tenantId: optionalPositiveInteger(params.get("tenantId")),
    uploadId: uploadId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId) ? uploadId : undefined,
    documentStatus: documentStatus === "REGISTERED" || documentStatus === "REJECTED" ? documentStatus : undefined,
    createdFrom: optionalDate(params.get("createdFrom")),
    createdTo: optionalDate(params.get("createdTo")),
    updatedFrom: optionalDate(params.get("updatedFrom")),
    updatedTo: optionalDate(params.get("updatedTo")),
  };
}

function contractListSort(params: URLSearchParams): Pick<ContractDocumentListFilters, "sort"> {
  const sort = params.get("sort");
  return sort && /^(contractDocumentId|createdAt|updatedAt),(asc|desc)$/.test(sort) ? { sort } : {};
}

export async function findNextPendingContract(documentId: string, returnPath: string, position: number): Promise<{
  document?: ContractDocument; returnPath: string; position: number;
}> {
  const path = contractListReturnPath(returnPath);
  const url = new URL(path, "https://admin.invalid");
  const page = positiveInteger(url.searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(url.searchParams.get("size"), 20, 100);
  const filters = { ...contractListFilters(url.searchParams), ...contractListSort(url.searchParams) };
  let result = await fetchContractDocuments("PENDING", page, size, filters);
  const maxPage = Math.max(1, Math.ceil(result.totalElements / size));
  let currentPage = page;
  if (page > maxPage) {
    // Removing the last row can remove a whole page. Continue from the valid queue page.
    result = await fetchContractDocuments("PENDING", maxPage, size, filters);
    currentPage = maxPage;
    url.searchParams.set("page", String(maxPage));
  }
  function choose(hint: number) {
    const available = result.documents.filter((document) => document.documentId !== documentId && document.status === "PENDING_REVIEW");
    const document = available[contractReviewPosition(String(hint), size)] ?? available[0];
    return document ? { document, returnPath: `${LIST_PATH}${url.search}`, position: result.documents.indexOf(document) } : undefined;
  }
  const next = choose(currentPage === page ? position : 0);
  if (next) return next;
  if (result.totalElements > 0) {
    // Another admin can remove rows between queries. Recheck the beginning instead of
    // treating the end of one page as completion of the whole queue.
    result = await fetchContractDocuments("PENDING", 1, size, filters);
    url.searchParams.set("page", "1");
    const first = choose(0);
    if (first) return first;
    if (result.totalElements > 0) throw new Error("다음 계약서를 확정하지 못했습니다. 대기 목록을 다시 확인해 주세요.");
  }
  return { returnPath: `${LIST_PATH}${url.search}`, position: 0 };
}
