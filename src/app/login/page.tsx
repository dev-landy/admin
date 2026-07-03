"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Space, Typography } from "antd";
import { MessageOutlined } from "@ant-design/icons";

import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";

const { Title, Text } = Typography;

const KAKAO_YELLOW = "#FEE500";
const KAKAO_LABEL_COLOR = "rgba(0, 0, 0, 0.85)";

function LoginContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied") === "1";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  function handleKakaoLogin() {
    window.location.assign("/auth/kakao/start");
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: 360 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Landy Admin
          </Title>
          <Space size={8}>
            <EnvTag />
            <Text type="secondary">관리자 로그인</Text>
          </Space>
        </div>

        {denied && (
          <Alert
            type="error"
            message="관리자 권한이 없는 계정입니다."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Button
          icon={<MessageOutlined />}
          block
          size="large"
          onClick={handleKakaoLogin}
          style={{
            background: KAKAO_YELLOW,
            borderColor: KAKAO_YELLOW,
            color: KAKAO_LABEL_COLOR,
            fontWeight: 600,
          }}
        >
          카카오로 로그인
        </Button>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
