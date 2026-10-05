"use client";

import { Alert, Tabs } from "antd";
import { RelatedPageBack } from "@/components/RelatedPageBack";

import { PageHeader } from "@/components/PageHeader";
import { FcmTokenSendCard } from "@/features/fcm/components/FcmTokenSendCard";
import { FcmTopicSubscriptionCard } from "@/features/fcm/components/FcmTopicSubscriptionCard";
import { FcmSilentPushCard } from "@/features/fcm/components/FcmSilentPushCard";

export default function FcmPage() {
  return (
    <>
      <PageHeader title="FCM 테스트" description="대상 기기를 확인한 뒤 필요한 테스트나 구독 작업을 선택하세요." extra={<RelatedPageBack />} />
      <Tabs aria-label="FCM 작업" defaultActiveKey="device" items={[
        { key: "device", label: "기기 테스트", children: <div className="admin-operation-workspace" style={{ maxWidth: "none" }}>
          <FcmTokenSendCard />
        </div> },
        { key: "topic", label: "토픽 구독", children: <div className="admin-operation-workspace"><FcmTopicSubscriptionCard /></div> },
        { key: "silent", label: "백그라운드 푸시", children: <div className="admin-operation-workspace">
          <Alert type="info" showIcon title="기기의 백그라운드 작업을 호출합니다."
            description="Silent Push는 DB 알림이나 Outbox로 저장되지 않습니다. 운영 토픽과 임의 토픽의 발송 대상을 구분해 확인하세요." style={{ marginBottom: 16 }} />
          <FcmSilentPushCard />
        </div> },
      ]} />
    </>
  );
}
