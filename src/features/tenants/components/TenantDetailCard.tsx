"use client";

import { useState } from "react";
import { App, Button, Card, Descriptions, Popconfirm, Space, Tag } from "antd";
import { useRouter } from "next/navigation";

import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteTenant } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";
import type { TenantDetail } from "../types";

export function TenantDetailCard({ tenant }: { tenant: TenantDetail }) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant();
  const [editOpen, setEditOpen] = useState(false);

  function handleDelete() {
    deleteTenant(tenant.tenantId, {
      onSuccess: () => router.replace("/tenants"),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ message: p?.title ?? "삭제 실패", description: p?.detail });
      },
    });
  }

  return (
    <>
      <Card
        title={`임차인 #${tenant.tenantId} — ${tenant.name}`}
        extra={
          <Space>
            <Button onClick={() => setEditOpen(true)}>수정</Button>
            <Popconfirm title="임차인을 삭제하시겠습니까?" onConfirm={handleDelete}>
              <Button danger loading={isDeleting}>삭제</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="유저 ID">{tenant.userId}</Descriptions.Item>
          <Descriptions.Item label="호실">{tenant.roomNumber}</Descriptions.Item>
          <Descriptions.Item label="전화번호">{tenant.phone}</Descriptions.Item>
          <Descriptions.Item label="월세">{tenant.rentPrice.toLocaleString()}원</Descriptions.Item>
          <Descriptions.Item label="납부일">매월 {tenant.paymentDay}일</Descriptions.Item>
          <Descriptions.Item label="알림">
            <Tag color={tenant.notifyEnabled ? "green" : "default"}>
              {tenant.notifyEnabled ? "활성" : "비활성"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="계약 시작일">{tenant.startDate}</Descriptions.Item>
          <Descriptions.Item label="계약 종료일">{tenant.endDate ?? "진행중"}</Descriptions.Item>
          <Descriptions.Item label="생성일">{tenant.createdAt}</Descriptions.Item>
          <Descriptions.Item label="수정일">{tenant.updatedAt}</Descriptions.Item>
        </Descriptions>
      </Card>
      <TenantEditDrawer tenant={tenant} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
