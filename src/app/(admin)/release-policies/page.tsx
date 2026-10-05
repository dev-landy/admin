"use client";

import { Suspense } from "react";
import { Spin } from "antd";
import { ReleasePolicyList } from "@/features/releasePolicies/components/ReleasePolicyList";

export default function ReleasePoliciesPage() {
  return <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><ReleasePolicyList /></Suspense>;
}
