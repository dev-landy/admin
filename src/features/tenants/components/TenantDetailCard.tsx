"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Card, Descriptions, Switch, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { ClientLinkButton } from "@/components/ClientLinkButton";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format/date";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useDeleteTenant, useUpdateTenant } from "../hooks";
import { TenantEditDrawer } from "./TenantEditDrawer";
import { TenantChargesCell, TenantContractCell } from "./TenantRecordCells";
import styles from "./TenantDetailCard.module.css";
import type { TenantDetail } from "../types";

export function TenantDetailCard({ tenant, returnPath = "/tenants", currentPath = `/tenants/${tenant.tenantId}` }: {
  tenant: TenantDetail; returnPath?: string; currentPath?: string;
}) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutateAsync: deleteTenant, isPending: isDeleting } = useDeleteTenant();
  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant(tenant.tenantId);
  const [editOpen, setEditOpen] = useState(false);

  function handleDueAlimtalkChange(enabled: boolean) {
    updateTenant({ dueAlimtalkEnabled: enabled }, {
      onSuccess: () => notification.success({ title: `납부일 알림톡을 ${enabled ? "켰습니다" : "껐습니다"}.` }),
      onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "알림톡 설정 변경 실패", description: problem?.detail }); },
    });
  }
  function handleDelete() {
    return deleteTenant(tenant.tenantId, {
      onSuccess: () => { notification.success({ title: `임차인 #${tenant.tenantId}를 삭제했습니다.` }); router.replace(returnPath); },
      onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail }); },
    });
  }

  return <div className={styles.workspace}>
    <Card className={styles.identity} title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>임차인 정보</Typography.Title>}
      extra={<RowActions subject={`임차인 #${tenant.tenantId}`} loading={isDeleting} disabled={isDeleting || isUpdating}
        primary={<Button onClick={() => setEditOpen(true)} disabled={isDeleting || isUpdating}>수정</Button>}
        items={[
          { key: "delete", label: "임차인 삭제", danger: true, onClick: handleDelete,
            confirm: { title: "임차인을 삭제하시겠습니까?", description: `임차인 #${tenant.tenantId} · ${tenant.name} 계약을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`, okText: "삭제" } },
        ]} />}
    >
      <div className="admin-detail-grid">
        <EntityCell primary={tenant.name} secondary={`임차인 전화번호 ${tenant.phone || "없음"}`} meta={`임차인 #${tenant.tenantId}`} />
        <Descriptions column={1} size="small" items={[
          { key: "property", label: "건물·호실", children: <EntityCell primary={<span>{tenant.propertyId ? <Link href={relatedListPath("/properties", {
            propertyId: tenant.propertyId, propertyTenantsId: tenant.propertyId,
          }, currentPath)}>{tenant.propertyName ?? `건물 #${tenant.propertyId}`}</Link> : "건물 정보 없음"} · 호실 {tenant.roomNumber}</span>} secondary={tenant.propertyAddress ?? "주소 정보 없음"} meta={tenant.propertyId ? `건물 #${tenant.propertyId}` : undefined} /> },
          { key: "owner", label: "임대인 연락처", children: <EntityCell primary={<Link href={listDetailPath("/users", tenant.userId, currentPath)}>
            {tenant.userEmail || `유저 #${tenant.userId}`}
          </Link>} secondary={`임대인 전화번호 ${tenant.userPhone || "없음"}`} meta={`유저 #${tenant.userId}`} /> },
        ]} />
      </div>
      <div className="admin-detail-meta">등록 {formatDateTime(tenant.createdAt)} · 최근 수정 {formatDateTime(tenant.updatedAt)}</div>
    </Card>
    <Card title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>계약·청구 정보</Typography.Title>}>
      <div className="admin-detail-grid">
        <TenantContractCell tenant={tenant} />
        <TenantChargesCell tenant={tenant} />
      </div>
    </Card>
    <Card title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>업무 이력</Typography.Title>}>
      <RowActions subject={`임차인 #${tenant.tenantId} 이력`}
        primary={<ClientLinkButton href={relatedListPath("/payments", { tenantId: tenant.tenantId, userId: tenant.userId }, currentPath)}>납부 내역</ClientLinkButton>}
        items={[{ key: "alimtalk", label: "알림톡 내역", href: relatedListPath("/alimtalk", { tenantId: tenant.tenantId, userId: tenant.userId }, currentPath) }]}
      />
    </Card>
    <Card className={styles.settings} title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>알림 설정</Typography.Title>}>
      <div className="admin-detail-grid">
        <div className="admin-setting-row">
          <div><Typography.Text strong>임대인 푸시 알림</Typography.Text><div className="admin-detail-meta">임대인이 앱에서 설정한 푸시 수신 상태</div></div>
          <Tag color={tenant.notifyEnabled ? "green" : "default"}>{tenant.notifyEnabled ? "활성" : "비활성"}</Tag>
        </div>
        <div className="admin-setting-row">
          <div><Typography.Text strong>납부일 알림톡</Typography.Text><div className="admin-detail-meta">세입자에게 발송합니다. 임대인의 세입자 알림톡 설정도 켜져 있어야 나갑니다.</div></div>
          <Switch aria-label="납부일 알림톡" checked={tenant.dueAlimtalkEnabled} loading={isUpdating} disabled={isUpdating || isDeleting}
            checkedChildren="수신" unCheckedChildren="미수신" onChange={handleDueAlimtalkChange} />
        </div>
      </div>
    </Card>
    <TenantEditDrawer tenant={tenant} open={editOpen} onClose={() => setEditOpen(false)} />
  </div>;
}
