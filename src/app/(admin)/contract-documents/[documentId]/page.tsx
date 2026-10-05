"use client";

import { Suspense, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import { ContractDocumentReview } from "@/features/contract-ocr/components/ContractDocumentReview";
import { contractListReturnPath, contractReviewPosition } from "@/features/contract-ocr/navigation";

function ContractDocumentReviewContent({ documentId }: { documentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listPath = contractListReturnPath(searchParams.get("returnTo"), searchParams.get("from") === "completed");
  const size = Number(new URLSearchParams(listPath.split("?")[1]).get("size") ?? 20);
  const position = contractReviewPosition(searchParams.get("position"), size);
  return <ContractDocumentReview key={documentId} documentId={documentId} onBack={() => router.push(listPath)}
    continuation={{ returnPath: listPath, position, onNavigate: (path) => router.push(path) }} />;
}

export default function ContractDocumentReviewPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  return <Suspense fallback={<Spin style={{ display: "block", textAlign: "center", margin: "80px 0" }} />}>
    <ContractDocumentReviewContent documentId={documentId} />
  </Suspense>;
}
