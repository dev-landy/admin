"use client";

import type { ReactNode } from "react";
import { Typography } from "antd";

type Props = {
  title: string;
  description?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, description, extra, children }: Props) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={1} className="admin-page-title">{title}</Typography.Title>
          {description && <Typography.Paragraph type="secondary" className="admin-page-description">{description}</Typography.Paragraph>}
        </div>
        {extra && <div className="admin-actions">{extra}</div>}
      </div>
      {children}
    </div>
  );
}
