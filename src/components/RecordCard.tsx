"use client";

import { useState, type ReactNode } from "react";

export function RecordCard({ title, subtitle, meta, fields, actions, extra, details, ariaLabel }: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  fields: readonly { label: string; value: ReactNode }[];
  actions?: ReactNode;
  extra?: ReactNode;
  details?: ReactNode;
  ariaLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return <article className="admin-record-card" aria-label={ariaLabel}>
    <header className="admin-record-header">
      <div className="admin-record-identity"><div className="admin-record-title">{title}</div>{subtitle && <div className="admin-record-subtitle">{subtitle}</div>}{meta && <div className="admin-record-meta">{meta}</div>}</div>
      {extra && <div className="admin-record-extra">{extra}</div>}
    </header>
    <dl className="admin-record-fields">{fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{typeof value === "boolean" ? (value ? "예" : "아니오") : (value ?? "—")}</dd></div>)}</dl>
    {details && <details className="admin-record-details" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>추가 정보</summary><div hidden={!expanded}>{details}</div></details>}
    {actions && <footer className="admin-record-actions">{actions}</footer>}
  </article>;
}
