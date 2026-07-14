"use client";

import { useState } from "react";
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

  function handleIssue() {
    issue(undefined, {
      onSuccess: (res) => setTokens(res),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ message: p?.title ?? "토큰 발급 실패", description: p?.detail });
      },
    });
  }

  function handleClose() {
    setTokens(null);
    onClose();
  }

  return (
    <Modal
      title="유저 토큰 발급"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          닫기
        </Button>,
        <Button key="issue" type="primary" loading={isPending} onClick={handleIssue}>
          발급
        </Button>,
      ]}
    >
      <Alert
        type="warning"
        showIcon
        message="발급된 토큰은 해당 유저의 실제 세션과 동일하게 동작합니다. 이 토큰으로 logout을 호출하면 유저의 모든 세션이 종료됩니다."
        style={{ marginBottom: 16 }}
      />
      {tokens && (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="accessToken">
            <Paragraph
              copyable={{ text: tokens.accessToken }}
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 0, maxWidth: 360 }}
            >
              {tokens.accessToken}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="refreshToken">
            <Paragraph
              copyable={{ text: tokens.refreshToken }}
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 0, maxWidth: 360 }}
            >
              {tokens.refreshToken}
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
}
