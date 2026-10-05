import { theme, type ThemeConfig } from "antd";
import { THEME_PALETTES, type ResolvedTheme } from "@/config/theme";

export function createAdminTheme(mode: ResolvedTheme, touch = false): ThemeConfig {
  const palette = THEME_PALETTES[mode];
  return {
    algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { key: "landy-admin" },
    token: {
      fontFamily: "var(--font-pretendard), sans-serif",
      fontFamilyCode: "var(--font-pretendard), sans-serif",
      fontSize: touch ? 16 : 14,
      colorBgBase: palette.surface,
      colorBgLayout: palette.bg,
      colorBgContainer: palette.surface,
      colorBgElevated: palette.raised,
      colorText: palette.text,
      colorTextSecondary: palette.secondary,
      colorTextTertiary: palette.muted,
      colorTextQuaternary: palette.muted,
      colorTextPlaceholder: palette.muted,
      colorTextDisabled: palette.disabled,
      colorTextLightSolid: palette.onFilled,
      colorBorder: palette.borderStrong,
      colorBorderSecondary: palette.border,
      colorFillSecondary: palette.subtle,
      colorFillTertiary: palette.subtle,
      colorBgContainerDisabled: palette.subtle,
      // Filled buttons need a deep background; links and text accents use a
      // brighter foreground in dark mode instead of sharing the fill token.
      colorPrimary: palette.primary,
      colorPrimaryHover: palette.primaryHover,
      colorPrimaryActive: palette.primaryActive,
      colorPrimaryText: palette.link,
      colorPrimaryTextHover: palette.linkHover,
      colorPrimaryTextActive: palette.linkHover,
      colorLink: palette.link,
      colorLinkHover: palette.linkHover,
      colorLinkActive: palette.linkHover,
      colorError: palette.danger,
      colorErrorHover: palette.danger,
      colorErrorActive: palette.danger,
      colorSuccess: palette.success,
      colorWarning: palette.warning,
      colorInfo: palette.link,
      // Tag's preset labels use step 7, independently of semantic status colors.
      purple7: palette.purple,
      geekblue7: palette.geekblue,
      volcano7: palette.volcano,
      borderRadius: 8,
      controlHeight: touch ? 44 : 36,
      controlHeightSM: touch ? 44 : 28,
    },
    components: {
      Button: {
        primaryColor: palette.onFilled, dangerColor: palette.onFilled,
        defaultHoverColor: palette.link, defaultActiveColor: palette.linkHover,
        defaultHoverBorderColor: palette.focus, defaultActiveBorderColor: palette.linkHover,
      },
      Input: { activeBorderColor: palette.focus, hoverBorderColor: palette.linkHover },
      InputNumber: { activeBorderColor: palette.focus, hoverBorderColor: palette.linkHover, handleHoverColor: palette.link },
      DatePicker: { activeBorderColor: palette.focus, hoverBorderColor: palette.linkHover },
      Switch: {
        colorTextQuaternary: palette.switchTrack, colorTextTertiary: palette.switchTrack,
        trackHeight: 26, handleSize: 20, trackPadding: 3, trackMinWidth: 72,
        trackHeightSM: 22, handleSizeSM: 16, trackMinWidthSM: 48,
        innerMinMargin: 7, innerMaxMargin: 27, innerMinMarginSM: 6, innerMaxMarginSM: 22,
        handleShadow: "0 1px 2px rgb(0 0 0 / 12%)",
      },
      Table: { headerBg: palette.tableHeader, headerColor: palette.secondary, rowHoverBg: palette.hover },
      Pagination: {
        itemActiveBg: palette.surface, itemActiveColor: palette.link, itemActiveColorHover: palette.linkHover,
        colorPrimary: palette.focus, colorPrimaryHover: palette.linkHover,
      },
      Select: {
        optionSelectedColor: palette.text, optionSelectedBg: palette.hover, optionActiveBg: palette.hover,
        activeBorderColor: palette.focus, hoverBorderColor: palette.linkHover,
      },
      Menu: {
        itemHeight: 44, itemBg: palette.sidebar, itemColor: palette.sidebarText,
        itemHoverBg: palette.sidebarHover, itemSelectedColor: palette.link, itemSelectedBg: palette.hover,
        darkItemBg: palette.sidebar, darkSubMenuItemBg: palette.sidebar,
        darkItemColor: palette.sidebarText, darkItemSelectedColor: palette.link, darkItemSelectedBg: palette.hover,
      },
      Tabs: { itemSelectedColor: palette.link, itemHoverColor: palette.linkHover, itemActiveColor: palette.linkHover, inkBarColor: palette.link },
    },
  };
}
