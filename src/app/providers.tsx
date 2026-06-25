"use client";

import type { ReactNode } from "react";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider, type ThemeConfig } from "antd";
import koKR from "antd/locale/ko_KR";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { getQueryClient } from "@/lib/query/get-query-client";
import { AuthProvider } from "@/features/auth/context";

const antdTheme: ThemeConfig = {
  token: {
    fontFamily: "var(--font-geist-sans)",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <AntdRegistry>
      <ConfigProvider locale={koKR} theme={antdTheme}>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
            {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
