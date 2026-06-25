"use client";

import { use } from "react";
import { Button, Space, Spin, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { useTenant } from "@/features/tenants/hooks";
import { TenantDetailCard } from "@/features/tenants/components/TenantDetailCard";

type Props = { params: Promise<{ tenantId: string }> };

export default function TenantDetailPage({ params }: Props) {
  const { tenantId: tenantIdStr } = use(params);
  const tenantId = Number(tenantIdStr);
  const router = useRouter();
  const { data: tenant, isLoading } = useTenant(tenantId);

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />;
  }

  if (!tenant) {
    return <Typography.Text type="secondary">임차인을 찾을 수 없습니다.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/tenants")}>목록으로</Button>
      <TenantDetailCard tenant={tenant} />
    </Space>
  );
}
