export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "landy-admin-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveTheme(mode: ThemeMode, systemDark: boolean): ResolvedTheme {
  return mode === "system" ? systemDark ? "dark" : "light" : mode;
}

const variableNames = {
  bg: "--admin-bg", surface: "--admin-surface", raised: "--admin-surface-raised", subtle: "--admin-surface-subtle",
  text: "--admin-text", secondary: "--admin-text-secondary", muted: "--admin-text-muted", disabled: "--admin-text-disabled",
  border: "--admin-border", borderStrong: "--admin-border-strong", hover: "--admin-hover", tableHeader: "--admin-table-header",
  primary: "--admin-primary-fill", primaryHover: "--admin-primary-hover", primaryActive: "--admin-primary-active",
  onFilled: "--admin-on-filled",
  primaryBorder: "--admin-primary-border",
  link: "--admin-link", linkHover: "--admin-link-hover", focus: "--admin-focus",
  danger: "--admin-danger-text", dangerFill: "--admin-danger-fill", dangerHover: "--admin-danger-hover",
  success: "--admin-success-text", warning: "--admin-warning-text",
  purple: "--admin-purple-text", geekblue: "--admin-geekblue-text", volcano: "--admin-volcano-text", switchTrack: "--admin-switch-track",
  dangerBg: "--admin-danger-bg", successBg: "--admin-success-bg", warningBg: "--admin-warning-bg", infoBg: "--admin-info-bg", orange: "--admin-orange-text", orangeBg: "--admin-orange-bg",
  selection: "--admin-selection", selectionText: "--admin-selection-text", codeBg: "--admin-code-bg",
  sidebar: "--admin-sidebar-bg", sidebarText: "--admin-sidebar-text", sidebarMuted: "--admin-sidebar-muted", sidebarHover: "--admin-sidebar-hover",
  envProd: "--admin-env-prod", envDev: "--admin-env-dev", envLocal: "--admin-env-local", shadow: "--admin-floating-shadow",
} as const;

type Palette = Record<keyof typeof variableNames, string>;
export const THEME_PALETTES: Record<ResolvedTheme, Palette> = {
  light: {
    bg: "#f5f7fa", surface: "#ffffff", raised: "#ffffff", subtle: "#eef2f7",
    text: "#25354b", secondary: "#46546a", muted: "#596579", disabled: "#8c98a9",
    border: "#dce3ed", borderStrong: "#7c899d", hover: "#eaf2fd", tableHeader: "#eef2f7",
    primary: "#0958d9", primaryHover: "#0749b9", primaryActive: "#003d9e",
    onFilled: "#ffffff",
    primaryBorder: "#0958d9",
    link: "#0958d9", linkHover: "#003d9e", focus: "#0958d9",
    danger: "#b42335", dangerFill: "#b42335", dangerHover: "#9b1c2b", success: "#216e35", warning: "#815700",
    purple: "#531dab", geekblue: "#1d39c4", volcano: "#b63816", switchTrack: "#596579",
    dangerBg: "#fff1f0", successBg: "#edf8ef", warningBg: "#fff7de", infoBg: "#e8f2ff", orange: "#8d4700", orangeBg: "#fff3e6",
    selection: "#cde3ff", selectionText: "#18273d", codeBg: "#f4f6fa",
    sidebar: "#ffffff", sidebarText: "#25354b", sidebarMuted: "#596579", sidebarHover: "#edf4ff",
    envProd: "#fff1f0", envDev: "#e6f4ff", envLocal: "#f6ffed", shadow: "0 8px 24px rgb(15 32 55 / 15%)",
  },
  dark: {
    bg: "#0f1621", surface: "#141f2e", raised: "#202c3d", subtle: "#202d40",
    text: "#e5eaf2", secondary: "#bec9d8", muted: "#a5b5cc", disabled: "#718097",
    border: "#2d3b52", borderStrong: "#657995", hover: "#203a59", tableHeader: "#202d40",
    primary: "#1668dc", primaryHover: "#1d70d3", primaryActive: "#1252b3",
    onFilled: "#ffffff",
    primaryBorder: "#5797e8",
    link: "#91caff", linkHover: "#b0d5ff", focus: "#8cc8ff",
    danger: "#ff9c9a", dangerFill: "#b42335", dangerHover: "#c53c47", success: "#9edf9a", warning: "#ffe58f",
    purple: "#ab7ae0", geekblue: "#7f9ef3", volcano: "#e87040", switchTrack: "#65778f",
    dangerBg: "#3a2028", successBg: "#193428", warningBg: "#332d19", infoBg: "#18314c", orange: "#ffd1a3", orangeBg: "#372716",
    selection: "#2f537d", selectionText: "#ffffff", codeBg: "#101927",
    sidebar: "#101927", sidebarText: "#e5eaf2", sidebarMuted: "#a5b5cc", sidebarHover: "#203a59",
    envProd: "#2c2028", envDev: "#172b42", envLocal: "#1a3026", shadow: "0 8px 28px rgb(0 0 0 / 42%)",
  },
};

function cssVariables(palette: Palette) {
  return (Object.keys(variableNames) as (keyof Palette)[]).map((key) => `${variableNames[key]}:${palette[key]};`).join("");
}

// The palette is shared by initial HTML, app CSS and Ant Design tokens.
export const THEME_CSS = `
:root{${cssVariables(THEME_PALETTES.light)}color-scheme:light;--admin-env-header:var(--admin-env-local)}
:root[data-theme="dark"]{${cssVariables(THEME_PALETTES.dark)}color-scheme:dark}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){${cssVariables(THEME_PALETTES.dark)}color-scheme:dark}}
:root[data-app-env="prod"]{--admin-env-header:var(--admin-env-prod)}
:root[data-app-env="dev"]{--admin-env-header:var(--admin-env-dev)}
:root .landy-admin{
--ant-color-bg-layout:var(--admin-bg);--ant-color-bg-container:var(--admin-surface);--ant-color-bg-elevated:var(--admin-surface-raised);
--ant-color-text:var(--admin-text);--ant-color-text-secondary:var(--admin-text-secondary);--ant-color-text-tertiary:var(--admin-text-muted);--ant-color-text-quaternary:var(--admin-text-muted);--ant-color-text-placeholder:var(--admin-text-muted);--ant-color-text-disabled:var(--admin-text-disabled);
--ant-color-text-heading:var(--admin-text);--ant-color-text-description:var(--admin-text-muted);--ant-color-icon:var(--admin-text-secondary);--ant-color-icon-hover:var(--admin-text);
--ant-color-border:var(--admin-border-strong);--ant-color-border-secondary:var(--admin-border);--ant-color-fill-tertiary:var(--admin-surface-subtle);--ant-color-bg-container-disabled:var(--admin-surface-subtle);
--ant-color-primary:var(--admin-primary-fill);--ant-color-primary-hover:var(--admin-primary-hover);--ant-color-primary-active:var(--admin-primary-active);--ant-color-link:var(--admin-link);--ant-color-link-hover:var(--admin-link-hover);--ant-color-link-active:var(--admin-link-hover);
--ant-color-error:var(--admin-danger-text);--ant-color-error-bg:var(--admin-danger-bg);--ant-color-success:var(--admin-success-text);--ant-color-success-bg:var(--admin-success-bg);--ant-color-warning:var(--admin-warning-text);--ant-color-warning-bg:var(--admin-warning-bg);--ant-color-info:var(--admin-link);--ant-color-info-bg:var(--admin-info-bg);
--ant-purple-7:var(--admin-purple-text);--ant-geekblue-7:var(--admin-geekblue-text);--ant-volcano-7:var(--admin-volcano-text);
}
:root .landy-admin.ant-switch{--ant-color-text-quaternary:var(--admin-switch-track);--ant-color-text-tertiary:var(--admin-switch-track)}
`;

/** Runs before hydration; storage failures fall back to the OS preference. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var m='system';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')m=s}catch(e){}var d=typeof matchMedia==='function'&&matchMedia('${SYSTEM_THEME_QUERY}').matches;var t=m==='system'?(d?'dark':'light'):m;var r=document.documentElement;r.dataset.theme=t;r.dataset.themeMode=m;r.style.colorScheme=t})()`;
