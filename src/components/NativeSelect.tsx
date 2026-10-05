import type { SelectHTMLAttributes } from "react";
import { DownOutlined } from "@ant-design/icons";
import styles from "./NativeSelect.module.css";

/** Keep native keyboard/mobile selection while sharing control and caret alignment. */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`admin-native-select ${styles.control}`}>
      <select {...props} className={[styles.select, className].filter(Boolean).join(" ")} />
      <DownOutlined aria-hidden="true" className={styles.chevron} />
    </span>
  );
}
