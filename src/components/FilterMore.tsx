"use client";

import { useContext, useState, type ReactNode } from "react";
import { FilterValidation } from "./FilterValidation";

/** Mounted optional fields retain Form values and validation while folded. */
export function FilterMore({ children, label = "상세 조건" }: { children: ReactNode; label?: string }) {
  const validation = useContext(FilterValidation);
  const [toggle, setToggle] = useState({ open: false, validation: 0 });
  const open = validation > toggle.validation || toggle.open;
  return <details className="admin-filter-more" open={open} onToggle={(event) => setToggle({ open: event.currentTarget.open, validation })}>
    <summary>{label} {open ? "접기" : "펼치기"}</summary>
    <div className="admin-filter-more-fields">{children}</div>
  </details>;
}
