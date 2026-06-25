"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Select, Typography } from "antd";

import { useAuth } from "@/features/auth/context";
import type { OAuthProvider } from "@/features/auth/types";

const { Title, Text } = Typography;

type LoginFormValues = {
  provider: OAuthProvider;
  sub: string;
};

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit({ sub, provider }: LoginFormValues) {
    setError(null);
    setIsPending(true);
    try {
      await login(sub.trim(), provider);
      router.replace("/");
    } catch {
      setError("로그인에 실패했습니다. 사용자 ID를 확인해주세요.");
    } finally {
      setIsPending(false);
    }
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
          <Text type="secondary">개발용 로그인</Text>
        </div>

        {error && (
          <Alert
            type="error"
            title={error}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          initialValues={{ provider: "KAKAO" }}
        >
          <Form.Item label="OAuth 제공자" name="provider">
            <Select size="large">
              <Select.Option value="KAKAO">카카오</Select.Option>
              <Select.Option value="GOOGLE">구글</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="사용자 ID (sub)"
            name="sub"
            rules={[{ required: true, message: "사용자 ID를 입력해주세요" }]}
          >
            <Input placeholder="예: 123456789" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isPending}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
