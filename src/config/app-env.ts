/**
 * 배포 환경(appEnv)별 표시 메타데이터.
 *
 * antd 등 UI 라이브러리에 의존하지 않는 순수 데이터 모듈로 유지할 것 —
 * 파비콘 생성(src/app/icon.tsx) 같은 서버 전용 컨텍스트에서도 임포트된다.
 */
import { env, type AppEnv } from "./env";

export interface AppEnvMeta {
  /** 배지/탭 제목에 쓰는 짧은 라벨 */
  label: string;
  /** 헤더에 표시하는 설명 문구 */
  description: string;
  /** antd Tag의 color 프리셋 */
  tagColor: string;
  /** 상단 스트립/파비콘 배경색 */
  stripColor: string;
  /** 어드민 헤더 배경 틴트 */
  headerBg: string;
}

export const APP_ENV_META: Record<AppEnv, AppEnvMeta> = {
  prod: {
    label: "PROD",
    description: "운영 서버 어드민",
    tagColor: "red",
    stripColor: "#ff4d4f",
    headerBg: "#fff1f0",
  },
  dev: {
    label: "DEV",
    description: "개발 서버 어드민",
    tagColor: "blue",
    stripColor: "#1677ff",
    headerBg: "#e6f4ff",
  },
  local: {
    label: "LOCAL",
    description: "로컬 개발 환경",
    tagColor: "green",
    stripColor: "#52c41a",
    headerBg: "#f6ffed",
  },
};

/** 현재 빌드의 환경 메타 (NEXT_PUBLIC_APP_ENV 기준) */
export const appEnvMeta: AppEnvMeta = APP_ENV_META[env.appEnv];
