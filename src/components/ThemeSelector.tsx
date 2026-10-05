"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Button, Dropdown } from "antd";
import { parseThemeMode, type ThemeMode } from "@/config/theme";
import { useTheme } from "./ThemeProvider";
import { ThemeIcon } from "./ThemeIcon";
import styles from "./ThemeSelector.module.css";

const options: readonly { value: ThemeMode; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

export function ThemeSelector() {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const menuId = useId();
  const label = options.find((option) => option.value === mode)!.label;
  const restoreFocus = () => trigger.current?.focus({ preventScroll: true });
  const choose = (nextMode: ThemeMode) => { setOpen(false); restoreFocus(); setMode(nextMode); };

  return <Dropdown trigger={["click"]} placement="bottomRight" open={open} autoFocus
    classNames={{ root: styles.popup }}
    onOpenChange={setOpen}
    menu={{ id: menuId, "aria-label": "화면 테마", selectable: true, selectedKeys: [mode],
      items: options.map(({ value, label: optionLabel }) => ({
        key: value, label: optionLabel, icon: <ThemeIcon kind={value} className={styles.icon} />,
        role: "menuitemradio", "aria-checked": mode === value, className: styles.option,
        extra: <span className={styles.check}>{mode === value && <ThemeIcon kind="check" />}</span>,
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === " ") { event.preventDefault(); choose(value); } },
      })),
      onClick: ({ key }) => choose(parseThemeMode(key)),
    }}>
    <Button ref={trigger} type="text" className={styles.trigger} icon={<ThemeIcon kind={mode} className={styles.icon} />}
      aria-label={`화면 테마: ${label}`} title={`화면 테마: ${label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }} />
  </Dropdown>;
}
