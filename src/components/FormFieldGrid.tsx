"use client";

import { Form } from "antd";
import type { ReactNode } from "react";

import styles from "./FormFieldGrid.module.css";

/** 입력과 선택적 작업 버튼을 같은 입력행에 놓고, 좁은 컨테이너에서는 세로로 배치한다. */
export function FormFieldGrid({ children, actions, columns = 2 }: { children: ReactNode; actions?: ReactNode; columns?: 2 | 3 }) {
  const hasActions = actions !== undefined && actions !== null && actions !== false;

  return (
    <div className={styles.container}>
      <div className={`${styles.grid}${columns === 3 ? ` ${styles.threeColumns}` : ""}${hasActions ? ` ${styles.withActions}` : ""}`}>
        {children}
        {hasActions && (
          <Form.Item className={styles.actions} label={<span aria-hidden="true">&nbsp;</span>}>
            {actions}
          </Form.Item>
        )}
      </div>
    </div>
  );
}
