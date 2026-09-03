import type { ReleaseChannel } from "./types";

// 목록과 수정 모달이 같은 색으로 채널을 표시한다. 어떤 채널을 고치는지가 한눈에 보여야 한다.
export const CHANNEL_COLOR: Record<ReleaseChannel, string> = {
  PRODUCTION: "green",
  PREVIEW: "blue",
  DEVELOPMENT: "default",
};
