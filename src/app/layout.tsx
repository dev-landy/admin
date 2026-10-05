import type { Metadata } from "next";

import "./globals.css";
import "@/components/ThemeTransition.css";
import { EnvTopStrip } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";
import { env } from "@/config/env";
import { THEME_BOOTSTRAP_SCRIPT, THEME_CSS } from "@/config/theme";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: `[${appEnvMeta.label}] Landy Admin`,
  description: `Landy 어드민 콘솔 (${appEnvMeta.description})`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-app-env={env.appEnv} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <style id="admin-theme-palette">{THEME_CSS}</style>
        <script id="admin-theme-initialization" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <EnvTopStrip />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
