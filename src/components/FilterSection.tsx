"use client";

import { Children, cloneElement, isValidElement, useState, type CSSProperties, type ReactNode } from "react";
import { Form, type FormProps } from "antd";
import { FilterValidation } from "./FilterValidation";

/** 기본 조건은 항상 표시하고 상세 조건의 오류만 펼쳐 수정할 수 있게 한다. */
export function FilterSection({ children }: { children: ReactNode }) {
  const [validation, setValidation] = useState(0);
  return <section className="admin-filter-section" aria-label="검색 조건">
    <FilterValidation value={validation}>{Children.map(children, (child) => {
      if (!isValidElement<FormProps>(child) || child.type !== Form) return child;
      const fieldCount = typeof child.props.children === "function" ? 3 : Children.toArray(child.props.children)
        .filter((field) => isValidElement(field) && field.type === Form.Item).length;
      return cloneElement(child, {
        className: [child.props.className, fieldCount === 1 ? "admin-filter-single-field" : undefined].filter(Boolean).join(" "),
        style: { ...child.props.style, "--admin-primary-fields": Math.max(1, fieldCount) } as CSSProperties,
        onFinishFailed(error) { setValidation((value) => value + 1); child.props.onFinishFailed?.(error); },
      });
    })}</FilterValidation>
  </section>;
}
