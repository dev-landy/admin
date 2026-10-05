"use client";

import { Form } from "antd";
import type { ReactNode } from "react";

/** 조회·초기화 버튼이 입력행과 맞도록 세로 폼의 라벨 공간을 유지한다. */
export function FilterActions({ children }: { children: ReactNode }) {
  return (
    <Form.Item className="admin-filter-buttons" label={<span aria-hidden="true">&nbsp;</span>}>
      {children}
    </Form.Item>
  );
}
