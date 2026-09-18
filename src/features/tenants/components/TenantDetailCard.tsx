"use client";

import { useState } from "react";
import { App, Button, Card, Descriptions, Popconfirm, Space, Switch, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { parseProblemDetail } from "@/lib/api/problem";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "../billingCycle";
import { formatBillingSchedule } from "../billingTiming";
import { useDeleteTenant, useUpdateTenant } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";
import type { TenantDetail } from "../types";

export function TenantDetailCard({ tenant }: { tenant: TenantDetail }) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant();
  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant(tenant.tenantId);
  const [editOpen, setEditOpen] = useState(false);

  // 낙관적 갱신은 하지 않는다. 실패하면 스위치가 서버 값에 남아야 "켠 줄 알았는데 안 갔다"가 생기지 않는다.
  function handleDueAlimtalkChange(enabled: boolean) {
    updateTenant(
      { dueAlimtalkEnabled: enabled },
      {
        onSuccess: () =>
          notification.success({ title: `납부일 알림톡을 ${enabled ? "켰습니다" : "껐습니다"}.` }),
        onError: (err) => {
          const p = parseProblemDetail(err);
          notification.error({ title: p?.title ?? "알림톡 설정 변경 실패", description: p?.detail });
        },
      },
    );
  }

  function handleDelete() {
    deleteTenant(tenant.tenantId, {
      onSuccess: () => router.replace("/tenants"),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "삭제 실패", description: p?.detail });
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
          <Descriptions.Item label="임대료">
            {formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice)}
          </Descriptions.Item>
          <Descriptions.Item label="관리비">{formatManwon(tenant.maintenanceFee)}</Descriptions.Item>
          <Descriptions.Item label="보증금">{formatManwon(tenant.depositAmount)}</Descriptions.Item>
          <Descriptions.Item label="납부 조건">
            {formatBillingSchedule(tenant.billingTiming, tenant.paymentDay)}
          </Descriptions.Item>
          <Descriptions.Item label="알림">
            <Tag color={tenant.notifyEnabled ? "green" : "default"}>
              {tenant.notifyEnabled ? "활성" : "비활성"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="납부일 알림톡">
            <Space>
              <Switch
                checked={tenant.dueAlimtalkEnabled}
                loading={isUpdating}
                checkedChildren="수신"
                unCheckedChildren="미수신"
                onChange={handleDueAlimtalkChange}
              />
              <Typography.Text type="secondary">
                세입자에게 발송 · 유저의 세입자 알림톡 설정이 켜져 있어야 나갑니다
              </Typography.Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="계약 시작일">{tenant.startDate}</Descriptions.Item>
          <Descriptions.Item label="계약 종료일">{tenant.endDate ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="생성일">{tenant.createdAt}</Descriptions.Item>
          <Descriptions.Item label="수정일">{tenant.updatedAt}</Descriptions.Item>
        </Descriptions>
      </Card>
      <TenantEditDrawer tenant={tenant} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
