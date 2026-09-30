"use client";

import { Suspense, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import { ContractDocumentReview } from "@/features/contract-ocr/components/ContractDocumentReview";

function ContractDocumentReviewContent({ documentId }: { documentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listPath = searchParams.get("from") === "completed" ? "/contract-ocr?status=completed" : "/contract-ocr";
  return <ContractDocumentReview key={documentId} documentId={documentId} onBack={() => router.push(listPath)} />;
}

export default function ContractDocumentReviewPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  return <Suspense fallback={<Spin style={{ display: "block", textAlign: "center", margin: "80px 0" }} />}>
    <ContractDocumentReviewContent documentId={documentId} />
  </Suspense>;
}
