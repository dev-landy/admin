"use client";

import type { Ref } from "react";
import { Button, type ButtonProps } from "antd";
import { LoadingOutlined, ReloadOutlined } from "@ant-design/icons";

type Props = Omit<ButtonProps, "icon" | "iconPlacement" | "iconPosition"> & {
  ref?: Ref<HTMLAnchorElement | HTMLButtonElement>;
};

/** 로딩 아이콘이 기존 아이콘을 대체하도록 해 조회 전후 버튼 폭을 유지한다. */
export function RefreshButton({ children = "새로고침", loading, ...props }: Props) {
  const loadingIcon = <LoadingOutlined aria-hidden="true" spin />;
  const loadingState = typeof loading === "object"
    ? { ...loading, icon: loadingIcon }
    : loading ? { icon: loadingIcon } : loading;

  return <Button {...props} loading={loadingState} icon={<ReloadOutlined aria-hidden="true" />}>{children}</Button>;
}
