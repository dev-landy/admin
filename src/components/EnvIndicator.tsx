import { Tag } from "antd";

import { appEnvMeta } from "@/config/app-env";

/**
 * 모든 페이지 최상단에 깔리는 환경 색상 스트립 (prod=빨강, dev=파랑, local=초록).
 * 클릭을 가로채지 않도록 pointerEvents를 끄고, 모달 위에서도 보이게 z-index를 높게 둔다.
 */
export function EnvTopStrip() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: appEnvMeta.stripColor,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}

/** 현재 배포 환경을 나타내는 배지 (PROD / DEV / LOCAL) */
export function EnvTag() {
  return (
    <Tag color={appEnvMeta.tagColor} style={{ marginInlineEnd: 0, fontWeight: 600 }}>
      {appEnvMeta.label}
    </Tag>
  );
}
