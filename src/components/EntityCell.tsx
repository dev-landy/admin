import type { ReactNode } from "react";

/** Keep the record's identity together; technical IDs remain secondary context. */
export function EntityCell({ primary, secondary, meta, children }: {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return <div className="admin-entity-cell">
    <div className="admin-entity-primary">{primary}</div>
    {secondary != null && <div className="admin-entity-secondary">{secondary}</div>}
    {meta != null && <div className="admin-entity-meta">{meta}</div>}
    {children}
  </div>;
}
