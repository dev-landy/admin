"use client";

import { Alert, Col, Row, Typography } from "antd";

import { FcmTokenSendCard } from "@/features/fcm/components/FcmTokenSendCard";
import { FcmTopicSubscriptionCard } from "@/features/fcm/components/FcmTopicSubscriptionCard";
import { FcmSilentPushCard } from "@/features/fcm/components/FcmSilentPushCard";

const { Title } = Typography;

export default function FcmPage() {
  return (
    <>
      <Title level={4} style={{ marginTop: 0 }}>
        FCM 테스트
      </Title>
      <Alert
        type="info"
        showIcon
        title="등록 토큰 테스트 알림은 CUSTOM 타입으로 저장하고 선택한 토큰에 직접 발송합니다."
        description="outbox는 생성하지 않으며, Silent Push와 토픽 구독 관리도 DB 알림 발송 대상이 아닙니다."
        style={{ marginBottom: 16 }}
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <FcmTokenSendCard />
        </Col>
        <Col xs={24} lg={12}>
          <FcmTopicSubscriptionCard />
        </Col>
        <Col xs={24} lg={12}>
          <FcmSilentPushCard />
        </Col>
      </Row>
    </>
  );
}
