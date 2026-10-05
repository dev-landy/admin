"use client";

import { Tag } from "antd";
import type { UserSummary } from "../types";
import { USER_STATUS_PRESENTATION } from "../userStatus";

/** Withdrawal is an account lifecycle state, independent of onboarding progress. */
export function UserAccountStatus({ user }: { user: Pick<UserSummary, "status" | "deletedAt"> }) {
  const withdrawn = user.deletedAt != null;
  const presentation = USER_STATUS_PRESENTATION[user.status];
  return <Tag variant="filled" color={withdrawn ? "error" : presentation.color} style={{ marginInlineEnd: 0 }}>
    {withdrawn ? "탈퇴" : presentation.label}
  </Tag>;
}
