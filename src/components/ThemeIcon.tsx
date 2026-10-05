import type { ThemeMode } from "@/config/theme";

/** Small stroke icons keep theme controls consistent with the header controls. */
export function ThemeIcon({ kind, className }: { kind: ThemeMode | "check"; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-theme-icon={kind}>
    {kind === "system" && <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>}
    {kind === "light" && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>}
    {kind === "dark" && <path d="M20.6 14.5A9 9 0 1 1 9.5 3.4A8.7 8.7 0 0 0 20.6 14.5Z" />}
    {kind === "check" && <path d="m5 12 4 4L19 6" />}
  </svg>;
}
