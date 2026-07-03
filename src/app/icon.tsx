import { ImageResponse } from "next/og";

import { appEnvMeta } from "@/config/app-env";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// 환경 색상 배경에 "L"을 그린 파비콘 — 브라우저 탭만 봐도 prod/dev가 구분된다.
// NEXT_PUBLIC_APP_ENV가 빌드 시점에 인라인되므로 Vercel 프로젝트별로 다른 아이콘이 생성된다.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: appEnvMeta.stripColor,
          color: "#fff",
          fontSize: 22,
          borderRadius: 6,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
