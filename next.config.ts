import type { NextConfig } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // icons의 CommonJS 진입점도 colors/es/generate를 사용한다. next/jest의 SWC 변환에 포함한다.
  transpilePackages: ["@ant-design/colors"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
