import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { EnvTopStrip } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <EnvTopStrip />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
