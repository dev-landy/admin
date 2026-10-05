"use client";

import { useMemo, type ReactNode } from "react";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { getQueryClient } from "@/lib/query/get-query-client";
import { AuthProvider } from "@/features/auth/context";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { createAdminTheme } from "@/components/ThemeTokens";
import { useAdminViewport } from "@/components/useAdminViewport";

export function Providers({ children }: { children: ReactNode }) {
  return <AntdRegistry><ThemeProvider><ThemedProviders>{children}</ThemedProviders></ThemeProvider></AntdRegistry>;
}

function ThemedProviders({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const touch = useAdminViewport() === "mobile";
  const antdTheme = useMemo(() => createAdminTheme(resolved, touch), [resolved, touch]);
  const queryClient = getQueryClient();

  return (
      <ConfigProvider locale={koKR} theme={antdTheme}>
        <AntdApp className="admin-antd-app">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
            {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
  );
}
