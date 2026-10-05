"use client";

import { App, Button, Card, Select, Switch, Typography } from "antd";
import type { RefSelectProps } from "antd";
import { useRouter } from "next/navigation";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { EntityCell } from "@/components/EntityCell";
import { useAdminViewport } from "@/components/useAdminViewport";
import { RowActions } from "@/components/RowActions";
import styles from "./UserDetailCard.module.css";
import { formatDateTime, formatTechnicalDateTime } from "@/lib/format/date";
import { parseProblemDetail } from "@/lib/api/problem";
import {
  useUpdateUserRole,
  useUpdateUserNotifySettings,
  useUpdateUserAlimtalkEnabled,
  useDeleteUser,
} from "../hooks";
import type { UserDetail } from "../types";
import { UserAccountStatus } from "./UserAccountStatus";
import { OAUTH_PROVIDER_LABELS } from "../oauthProvider";

export function UserDetailCard({ user, returnPath = "/users", children }: { user: UserDetail; returnPath?: string; children?: ReactNode }) {
  const router = useRouter();
  const { notification, modal } = App.useApp();
  const viewport = useAdminViewport();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { mutateAsync: updateRole, isPending: isRolePending } = useUpdateUserRole(user.userId);
  const { mutate: updateNotify, isPending: isNotifyPending } = useUpdateUserNotifySettings(user.userId);
  const { mutate: updateAlimtalk, isPending: isAlimtalkPending } = useUpdateUserAlimtalkEnabled(user.userId);
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();
  const readOnly = user.deletedAt != null;
  const operationScope = useRef({ userId: user.userId, readOnly });
  useLayoutEffect(() => {
    operationScope.current = { userId: user.userId, readOnly };
    return () => { operationScope.current = { userId: user.userId, readOnly: true }; };
  }, [user.userId, readOnly]);
  const canOperate = () => !operationScope.current.readOnly && operationScope.current.userId === user.userId;

  function updateRoleConfirmed(role: "USER" | "ADMIN") {
    if (!canOperate()) return Promise.resolve();
    return updateRole(role, {
      onSuccess: () => notification.success({ title: "역할이 변경되었습니다." }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "역할 변경 실패", description: p?.detail });
      },
    });
  }

  const roleConfirmation = useRef<{ destroy: () => void } | null>(null);
  const rolePending = useRef(false);
  const roleSelect = useRef<RefSelectProps>(null);
  useEffect(() => () => {
    roleConfirmation.current?.destroy();
    roleConfirmation.current = null;
    rolePending.current = false;
  }, [user.userId, user.deletedAt]);

  function handleRoleChange(role: "USER" | "ADMIN") {
    if (!canOperate() || role === user.role || isRolePending || rolePending.current) return;
    setSettingsOpen(true);
    roleConfirmation.current?.destroy();
    const dialog = modal.confirm({
      title: `${role === "ADMIN" ? "관리자" : "사용자"} 역할로 변경할까요?`,
      content: `유저 #${user.userId} · ${user.email}의 관리자 접근 권한이 ${role === "ADMIN" ? "허용" : "해제"}됩니다.`,
      okText: "역할 변경", cancelText: "취소",
      focusable: { autoFocusButton: "cancel" },
      mask: { closable: false },
      okButtonProps: { "aria-label": "역할 변경" },
      onOk: async () => {
        if (rolePending.current || roleConfirmation.current !== dialog) return;
        rolePending.current = true;
        dialog.update({ cancelButtonProps: { disabled: true }, okButtonProps: { disabled: true, "aria-busy": true, "aria-label": "역할 변경" }, keyboard: false });
        try {
          await updateRoleConfirmed(role);
        } catch (error) {
          if (roleConfirmation.current === dialog) {
            rolePending.current = false;
            dialog.update({ cancelButtonProps: { disabled: false }, okButtonProps: { disabled: false, "aria-busy": false, "aria-label": "역할 변경" }, keyboard: true });
          }
          throw error;
        }
      },
      afterClose: () => {
        if (roleConfirmation.current === dialog) {
          roleConfirmation.current = null;
          rolePending.current = false;
        }
        if (!roleConfirmation.current) roleSelect.current?.focus();
      },
    });
    roleConfirmation.current = dialog;
    // The hook's await mode retains a rejected request for retry without leaking a rejection.
    void dialog.then(() => undefined, () => undefined);
  }

  function handleNotifyChange(field: "notifyDue" | "notifyOverdue", enabled: boolean) {
    if (!canOperate()) return;
    updateNotify({ [field]: enabled }, {
      onSuccess: () => notification.success({ title: `${field === "notifyDue" ? "납부일" : "연체"} 알림을 ${enabled ? "켰습니다" : "껐습니다"}.` }),
      onError: (err) => {
        const problem = parseProblemDetail(err);
        notification.error({ title: problem?.title ?? "알림 설정 변경 실패", description: problem?.detail });
      },
    });
  }

  function handleAlimtalkChange(enabled: boolean) {
    if (!canOperate()) return;
    updateAlimtalk(enabled, {
      onSuccess: () =>
        notification.success({
          title: enabled
            ? "세입자 알림톡을 켰습니다. 임차인별 설정을 켜야 실제로 나갑니다."
            : "세입자 알림톡을 껐습니다. 임차인별 설정과 무관하게 전부 멈춥니다.",
        }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "알림톡 설정 변경 실패", description: p?.detail });
      },
    });
  }

  function handleDelete() {
    if (!canOperate()) return Promise.resolve();
    return deleteUser(user.userId, {
      onSuccess: () => { notification.success({ title: `유저 #${user.userId}를 삭제했습니다.` }); router.replace(returnPath); },
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "삭제 실패", description: p?.detail });
      },
    });
  }

  return <div className={styles.workspace}>
    <div className={styles.headerRegions}>
    <Card title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>계정 정보</Typography.Title>}
      extra={readOnly ? undefined : <RowActions subject={`유저 #${user.userId} 계정`} loading={isDeleting} disabled={isDeleting}
        primary={viewport === "mobile" ? <Button size="small" href="#user-settings" onClick={() => setSettingsOpen(true)}>설정 변경</Button> : null}
        items={[
          { key: "delete", label: "사용자 삭제", danger: true, onClick: handleDelete,
            confirm: { title: "이 유저를 삭제하시겠습니까?", description: `유저 #${user.userId} · ${user.email} 계정을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`, okText: "삭제" } },
        ]} />}
    >
      <div className={styles.overviewGrid}>
        <EntityCell primary={user.email} secondary={user.phone || "전화번호 없음"} meta={`유저 #${user.userId}`}>
          <UserAccountStatus user={user} />
        </EntityCell>
        <dl className={styles.profileMetadata} aria-label="계정 정보 요약">
          <div><dt>가입 경로</dt><dd>{OAUTH_PROVIDER_LABELS[user.provider] ?? user.provider}</dd></div>
          <div><dt>{readOnly ? "보관된 역할" : "현재 역할"}</dt><dd>{user.role === "ADMIN" ? "관리자" : "사용자"}</dd></div>
          <div><dt>가입일</dt><dd>{formatDateTime(user.createdAt)}</dd></div>
          <div><dt>수정일</dt><dd>{formatDateTime(user.updatedAt)}</dd></div>
          {readOnly && <div><dt>탈퇴일</dt><dd>{formatTechnicalDateTime(user.deletedAt)}</dd></div>}
        </dl>
      </div>
    </Card>
    {readOnly ? <Card className={styles.settings} title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>보관된 알림·권한 설정</Typography.Title>}>
      <Typography.Paragraph type="secondary">보관된 설정값이며, 현재 발송 가능 상태를 뜻하지 않습니다.</Typography.Paragraph>
      <dl className={styles.profileMetadata}>
        <div><dt>관리 권한</dt><dd>{user.role === "ADMIN" ? "관리자" : "사용자"}</dd></div>
        <div><dt>납부일 알림</dt><dd>{user.notifyDue ? "활성" : "비활성"}</dd></div>
        <div><dt>연체 알림</dt><dd>{user.notifyOverdue ? "활성" : "비활성"}</dd></div>
        <div><dt>세입자 알림톡</dt><dd>{user.alimtalkEnabled ? "사용" : "중지"}</dd></div>
      </dl>
    </Card> : <details id="user-settings" className={styles.settingsDisclosure} open={viewport !== "mobile" || settingsOpen}
      onToggle={(event) => { if (viewport === "mobile") setSettingsOpen(event.currentTarget.open); }}>
      <summary>알림·권한 설정 <span>현재 {user.role === "ADMIN" ? "관리자" : "사용자"} · {settingsOpen ? "접기" : "펼치기"}</span></summary>
      <div hidden={viewport === "mobile" && !settingsOpen}>
    <Card className={styles.settings} title={<Typography.Title level={2} style={{ margin: 0, fontSize: 18 }}>알림·권한 설정</Typography.Title>}>
      <div className="admin-detail-grid">
        <div className="admin-setting-row">
          <div><Typography.Text strong>관리 권한</Typography.Text><div className="admin-detail-meta">관리자는 어드민에 접근할 수 있습니다. 변경 전에 대상과 권한을 확인합니다.</div></div>
          <Select ref={roleSelect} value={user.role} onChange={handleRoleChange} loading={isRolePending} disabled={isRolePending || isDeleting}
            aria-label="사용자 역할" options={[{ label: "사용자", value: "USER" }, { label: "관리자", value: "ADMIN" }]} style={{ minWidth: 120 }} />
        </div>
        <div className="admin-setting-row">
          <div><Typography.Text strong>납부일 알림</Typography.Text><div className="admin-detail-meta">사용자에게 보내는 납부일 푸시 알림</div></div>
          <Switch checked={user.notifyDue} loading={isNotifyPending} disabled={isNotifyPending || isDeleting} aria-label="납부일 알림"
            checkedChildren="활성" unCheckedChildren="비활성" onChange={(enabled) => handleNotifyChange("notifyDue", enabled)} />
        </div>
        <div className="admin-setting-row">
          <div><Typography.Text strong>연체 알림</Typography.Text><div className="admin-detail-meta">사용자에게 보내는 연체 푸시 알림</div></div>
          <Switch checked={user.notifyOverdue} loading={isNotifyPending} disabled={isNotifyPending || isDeleting} aria-label="연체 알림"
            checkedChildren="활성" unCheckedChildren="비활성" onChange={(enabled) => handleNotifyChange("notifyOverdue", enabled)} />
        </div>
        <div className="admin-setting-row">
          <div><Typography.Text strong>세입자 알림톡</Typography.Text><div className="admin-detail-meta">켜져 있어도 임차인별 설정이 켜져 있어야 발송됩니다. 끄면 이 사용자의 세입자 발송이 모두 중지됩니다.</div></div>
          <Switch aria-label="세입자 알림톡" checked={user.alimtalkEnabled} loading={isAlimtalkPending} disabled={isAlimtalkPending || isDeleting}
            checkedChildren="사용" unCheckedChildren="중지" onChange={handleAlimtalkChange} />
        </div>
      </div>
    </Card>
      </div>
    </details>}
    </div>
    {children}
  </div>;
}
