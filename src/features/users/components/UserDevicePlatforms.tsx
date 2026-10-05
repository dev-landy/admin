"use client";

import { Tag } from "antd";
import styles from "./UserDevicePlatforms.module.css";

/** OS는 FCM 등록 정보만 사용하며 가입 경로에서 추정하지 않는다. */
export function UserDevicePlatforms({ platforms, showLabel = false }: {
  platforms?: readonly (string | null)[] | null;
  showLabel?: boolean;
}) {
  const values = Array.isArray(platforms) ? platforms : [];
  const labels = [
    ...(values.includes("ANDROID") ? ["Android"] : []),
    ...(values.includes("IOS") ? ["iOS"] : []),
    ...(values.length === 0 || values.some((value) => value !== "ANDROID" && value !== "IOS") ? ["미확인"] : []),
  ];

  return <span className={styles.platforms}>
    {showLabel && <span className={styles.label}>기기 OS:</span>}
    <span className={styles.badges}>
      {labels.map((label) => <Tag key={label} variant="outlined"
        color={label === "Android" ? "blue" : label === "iOS" ? "purple" : undefined}
        className={styles.badge}
        style={{ marginInlineEnd: 0, borderColor: "currentColor", backgroundColor: "color-mix(in srgb, currentColor 10%, var(--admin-surface))", ...(label === "미확인" ? { color: "var(--admin-text-secondary)" } : {}) }}
      >{label}</Tag>)}
    </span>
  </span>;
}
