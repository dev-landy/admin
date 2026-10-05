import type { NextConfig } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // 개발 요청 URL에는 검색어·연락처·OAuth 코드와 복귀 쿼리가 들어갈 수 있다.
  // 쿼리 있는 요청은 Next 터미널 로그에서 생략하고 API 진단은 관리자 서버에서 기록한다.
  logging: { incomingRequests: { ignore: [/\?/] } },
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
