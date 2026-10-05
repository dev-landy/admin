"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Space, Typography } from "antd";
import { MessageOutlined } from "@ant-design/icons";

import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";
import { ThemeSelector } from "@/components/ThemeSelector";
import { BrandLogo } from "@/components/BrandLogo";

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

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        background: "var(--admin-bg)",
      }}
    >
      <div className="admin-auth-theme"><ThemeSelector /></div>
      <Card style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <Title level={1} style={{ marginBottom: 4, fontSize: 24 }}>
            <BrandLogo />
          </Title>
          <Space size={8}>
            <EnvTag />
            <Text type="secondary">관리자 로그인</Text>
          </Space>
        </div>

        {denied && (
          <Alert
            type="error"
            title="관리자 권한이 없는 계정입니다."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Button
          icon={<MessageOutlined />}
          block
          size="large"
          href="/auth/kakao/start"
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
