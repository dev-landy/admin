"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Descriptions, Modal, Typography } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useIssueImpersonationTokens } from "../hooks";
import type { ImpersonationTokensResponse } from "../types";

const { Paragraph } = Typography;

type Props = { open: boolean; onClose: () => void; userId: number };

export function ImpersonationModal({ open, onClose, userId }: Props) {
  const { notification } = App.useApp();
  const { mutate: issue, isPending } = useIssueImpersonationTokens(userId);
  const [tokens, setTokens] = useState<ImpersonationTokensResponse | null>(null);

  const [session, setSession] = useState({ open, userId });
  if (session.open !== open || session.userId !== userId) {
    setSession({ open, userId });
    setTokens(null);
  }
  const generation = useRef(0);
  const issuing = useRef(false);
  useEffect(() => {
    generation.current += 1;
    issuing.current = false;
    return () => { generation.current += 1; };
  }, [open, userId]);

  function handleIssue() {
    if (!open || isPending || issuing.current) return;
    issuing.current = true;
    const requestGeneration = generation.current;
    issue(undefined, {
      onSuccess: (res) => { if (requestGeneration === generation.current) setTokens(res); },
      onError: (err) => {
        if (requestGeneration !== generation.current) return;
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "토큰 발급 실패", description: p?.detail });
      },
      onSettled: () => { if (requestGeneration === generation.current) issuing.current = false; },
    });
  }

  function handleClose() {
    if (isPending || issuing.current) return;
    setTokens(null);
    onClose();
  }

  return (
    <Modal
      title={`유저 #${userId} 토큰 발급`}
      closable={!isPending}
      keyboard={!isPending}
      mask={{ closable: !isPending }}
      destroyOnHidden
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="close" disabled={isPending} onClick={handleClose}>
          닫기
        </Button>,
        <Button key="issue" type="primary" loading={isPending} disabled={isPending} onClick={handleIssue}>
          발급
        </Button>,
      ]}
    >
      <Alert
        type="warning"
        showIcon
        title="발급된 토큰은 해당 유저의 실제 세션과 동일하게 동작합니다. 이 토큰으로 logout을 호출하면 유저의 모든 세션이 종료됩니다."
        style={{ marginBottom: 16 }}
      />
      {tokens && (
        <Descriptions
          column={1} bordered size="small"
          items={[
            {
              key: "accessToken", label: "accessToken", children: (
                <Paragraph copyable={{ text: tokens.accessToken }} ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: "100%" }}>
                  {tokens.accessToken}
                </Paragraph>
              ),
            },
            {
              key: "refreshToken", label: "refreshToken", children: (
                <Paragraph copyable={{ text: tokens.refreshToken }} ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: "100%" }}>
                  {tokens.refreshToken}
                </Paragraph>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
