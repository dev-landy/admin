"use client";

import { useState } from "react";
import { App, Button, Card, Descriptions, Popconfirm, Space, Switch, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { parseProblemDetail } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format/date";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "../billingCycle";
import { formatBillingSchedule } from "../billingTiming";
import { useDeleteTenant, useUpdateTenant } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";
import type { TenantDetail } from "../types";

export function TenantDetailCard({ tenant, returnPath = "/tenants" }: { tenant: TenantDetail; returnPath?: string }) {
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
      onSuccess: () => { notification.success({ title: `임차인 #${tenant.tenantId}를 삭제했습니다.` }); router.replace(returnPath); },
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
          <Space wrap>
            <Button onClick={() => setEditOpen(true)}>수정</Button>
            <Popconfirm title="임차인을 삭제하시겠습니까?" description={`임차인 #${tenant.tenantId} · ${tenant.name} 계약을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }} disabled={isDeleting} onConfirm={handleDelete}>
              <Button danger loading={isDeleting} disabled={isDeleting}>삭제</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions
          column={{ xs: 1, sm: 2 }} bordered size="small"
          items={[
            { key: "userId", label: "유저 ID", children: tenant.userId },
            { key: "room", label: "호실", children: tenant.roomNumber },
            { key: "phone", label: "전화번호", children: tenant.phone },
            { key: "rent", label: "임대료", children: formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice) },
            { key: "maintenance", label: "관리비", children: formatManwon(tenant.maintenanceFee) },
            { key: "deposit", label: "보증금", children: formatManwon(tenant.depositAmount) },
            { key: "billing", label: "납부 조건", children: formatBillingSchedule(tenant.billingTiming, tenant.paymentDay) },
            {
              key: "notify", label: "알림", children: (
                <Tag color={tenant.notifyEnabled ? "green" : "default"}>{tenant.notifyEnabled ? "활성" : "비활성"}</Tag>
              ),
            },
            {
              key: "alimtalk", label: "납부일 알림톡", children: (
                <Space orientation="vertical" size={8}>
                  <Switch
                    aria-label="납부일 알림톡" checked={tenant.dueAlimtalkEnabled} loading={isUpdating}
                    checkedChildren="수신" unCheckedChildren="미수신" onChange={handleDueAlimtalkChange}
                  />
                  <Typography.Text type="secondary">
                    세입자에게 발송 · 유저의 세입자 알림톡 설정이 켜져 있어야 나갑니다
                  </Typography.Text>
                </Space>
              ),
            },
            { key: "start", label: "계약 시작일", children: tenant.startDate },
            { key: "end", label: "계약 종료일", children: tenant.endDate ?? "-" },
            { key: "created", label: "생성일", children: formatDateTime(tenant.createdAt) },
            { key: "updated", label: "수정일", children: formatDateTime(tenant.updatedAt) },
          ]}
        />
      </Card>
      <TenantEditDrawer tenant={tenant} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
