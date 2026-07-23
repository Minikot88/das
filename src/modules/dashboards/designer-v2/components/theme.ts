import { createTheme } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";

const dashboardFontFamily = '"IBM Plex Sans Thai", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const dashboardV2Tokens = {
  color: {
    primary: "#2563EB",
    primarySoft: "#EAF2FF",
    primarySubtle: "#F4F7FB",
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceTranslucent: "rgba(255,255,255,.96)",
    surfaceMuted: "#F9FAFB",
    surfaceRaised: "#F4F7FB",
    canvasGrid: "#E6EAF0",
    canvasGridSoft: "rgba(230,234,240,.7)",
    text: "#111827",
    textMuted: "#6B7280",
    focusRing: "rgba(37,99,235,.14)",
    focusOutline: "rgba(37,99,235,.28)",
    border: "#E6EAF0",
    borderSubtle: "#EEF1F5",
    borderStrong: "#D8DEE8",
    borderHover: "#D8DEE8",
    selectedBorder: "#2563EB",
    selectedSurface: "#EAF2FF",
    success: "#16A34A",
    successAccent: "#20C997",
    successSoft: "#F0FDF4",
    successBorder: "#D8F3DF",
    warning: "#D97706",
    warningSoft: "#FFF4DE",
    warningBorder: "#FED7AA",
    danger: "#DC2626",
    dangerSoft: "#FFF1F6",
    dangerBorder: "#FFC2D4",
    date: "#3B82F6",
    dateSoft: "#EAF2FF",
    number: "#16A34A",
    numberSoft: "#EAFBF4",
    purple: "#8B5CF6",
    purpleSoft: "#F2EDFF",
    purpleSurface: "#F5F0FF",
    purpleBorder: "#D9CCFF",
    slate: "#64748B",
    slateLight: "#F1F5F9",
    scrollbar: "#CBD5E1",
    scrollbarHover: "#94A3B8",
  },
  radius: {
    dialog: 10,
    panel: 0,
    card: 6,
    preview: 8,
    gallery: 6,
    accordion: 0,
    control: 6,
    icon: 6,
    pill: 999,
  },
  shadow: {
    none: "none",
    card: "none",
    cardHover: "none",
    panel: "none",
    canvas: "none",
    canvasActive: "none",
    focus: "0 0 0 2px rgba(37,99,235,.14)",
    primary: "none",
    primaryHover: "none",
    selected: "none",
    selectedSubtle: "none",
    selectedInset: "inset 0 0 0 1px rgba(37,99,235,.18)",
    dialog: "0 18px 40px rgba(15,23,42,.12)",
    toast: "0 1px 2px rgba(15,23,42,.06)",
  },
  motion: {
    fast: "120ms ease-out",
    base: "150ms ease-out",
  },
  zIndex: {
    base: 1,
    sticky: 10,
    controls: 20,
    popover: 1300,
    dialog: 1400,
    toast: 1500,
    tooltip: 1600,
  },
  space: {
    xs: 0.5,
    sm: 1,
    md: 1.5,
    lg: 2,
    xl: 3,
    xxl: 4,
  },
} as const;

const dashboardV2Shadows: Shadows = [
  dashboardV2Tokens.shadow.none,
  dashboardV2Tokens.shadow.card,
  dashboardV2Tokens.shadow.cardHover,
  dashboardV2Tokens.shadow.canvas,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
  dashboardV2Tokens.shadow.dialog,
];

export const dashboardV2Theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: dashboardV2Tokens.color.primary,
      contrastText: dashboardV2Tokens.color.surface,
    },
    background: {
      default: dashboardV2Tokens.color.background,
      paper: dashboardV2Tokens.color.surface,
    },
    text: {
      primary: dashboardV2Tokens.color.text,
      secondary: dashboardV2Tokens.color.textMuted,
    },
    divider: dashboardV2Tokens.color.borderSubtle,
  },
  shape: {
    borderRadius: dashboardV2Tokens.radius.panel,
  },
  typography: {
    fontFamily: dashboardFontFamily,
    h6: {
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    h1: {
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    h2: {
      fontSize: 24,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    h3: {
      fontSize: 20,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    subtitle1: {
      fontSize: 15,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.38,
    },
    subtitle2: {
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.42,
    },
    body1: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.45,
    },
    body2: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.45,
    },
    caption: {
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    button: {
      textTransform: "none",
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: 0,
      lineHeight: 1.25,
    },
  },
  shadows: dashboardV2Shadows,
  zIndex: {
    appBar: dashboardV2Tokens.zIndex.controls,
    drawer: 1200,
    modal: dashboardV2Tokens.zIndex.dialog,
    snackbar: dashboardV2Tokens.zIndex.toast,
    tooltip: dashboardV2Tokens.zIndex.tooltip,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": {
          fontFamily: dashboardFontFamily,
        },
        "*": {
          fontFamily: "inherit",
          scrollbarWidth: "none",
        },
        "button, input, textarea, select": {
          fontFamily: "inherit",
        },
        "*::-webkit-scrollbar": {
          display: "none",
        },
        ".dashboard-v2-scrollarea, [role='tree']": {
          scrollbarWidth: "thin",
          scrollbarColor: `${dashboardV2Tokens.color.scrollbar} transparent`,
        },
        ".dashboard-v2-scrollarea::-webkit-scrollbar, [role='tree']::-webkit-scrollbar": {
          display: "block",
          width: 6,
          height: 6,
        },
        ".dashboard-v2-scrollarea::-webkit-scrollbar-track, [role='tree']::-webkit-scrollbar-track": {
          background: "transparent",
        },
        ".dashboard-v2-scrollarea::-webkit-scrollbar-thumb, [role='tree']::-webkit-scrollbar-thumb": {
          backgroundColor: dashboardV2Tokens.color.scrollbar,
          borderRadius: dashboardV2Tokens.radius.pill,
          border: "2px solid transparent",
          backgroundClip: "content-box",
        },
        ".dashboard-v2-scrollarea::-webkit-scrollbar-thumb:hover, [role='tree']::-webkit-scrollbar-thumb:hover": {
          backgroundColor: dashboardV2Tokens.color.scrollbarHover,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableTouchRipple: true,
      },
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: `2px solid ${dashboardV2Tokens.color.focusOutline}`,
            outlineOffset: 1,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: dashboardV2Tokens.radius.panel,
          borderColor: dashboardV2Tokens.color.borderSubtle,
          boxShadow: dashboardV2Tokens.shadow.panel,
          backgroundImage: "none",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
        },
        h1: { fontWeight: 600, lineHeight: 1.35 },
        h2: { fontWeight: 500, lineHeight: 1.35 },
        h3: { fontWeight: 500, lineHeight: 1.35 },
        h4: { fontWeight: 500, lineHeight: 1.35 },
        h5: { fontWeight: 500, lineHeight: 1.35 },
        h6: { fontWeight: 500, lineHeight: 1.35 },
        subtitle1: { fontWeight: 500, lineHeight: 1.35 },
        subtitle2: { fontWeight: 500, lineHeight: 1.35 },
        body1: { fontWeight: 400, lineHeight: 1.45 },
        body2: { fontWeight: 400, lineHeight: 1.45 },
        caption: { fontWeight: 400, lineHeight: 1.35 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 500,
          lineHeight: 1.25,
          borderRadius: dashboardV2Tokens.radius.control,
          minHeight: 32,
          paddingInline: 12,
          boxShadow: "none",
          transition: `background-color ${dashboardV2Tokens.motion.base}, border-color ${dashboardV2Tokens.motion.base}, color ${dashboardV2Tokens.motion.base}`,
          "&:hover": {
            transform: "none",
            boxShadow: "none",
            backgroundColor: dashboardV2Tokens.color.primarySubtle,
          },
        },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            backgroundColor: "#1D4ED8",
          },
        },
        outlined: {
          borderColor: dashboardV2Tokens.color.border,
          backgroundColor: dashboardV2Tokens.color.surface,
          color: dashboardV2Tokens.color.text,
          "&:hover": {
            borderColor: dashboardV2Tokens.color.selectedBorder,
            backgroundColor: dashboardV2Tokens.color.primarySubtle,
            color: dashboardV2Tokens.color.primary,
            boxShadow: "none",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: dashboardV2Tokens.radius.control,
          color: dashboardV2Tokens.color.slate,
          width: 28,
          height: 28,
          transition: `background-color ${dashboardV2Tokens.motion.base}, color ${dashboardV2Tokens.motion.base}`,
          "&:hover": {
            transform: "none",
            backgroundColor: dashboardV2Tokens.color.primarySubtle,
            color: dashboardV2Tokens.color.primary,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          minHeight: 32,
          borderRadius: dashboardV2Tokens.radius.control,
          backgroundColor: dashboardV2Tokens.color.surface,
          transition: `border-color ${dashboardV2Tokens.motion.base}`,
          "& .MuiOutlinedInput-notchedOutline legend": {
            lineHeight: 1.35,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: dashboardV2Tokens.color.borderStrong,
          },
          "&.Mui-focused": {
            boxShadow: dashboardV2Tokens.shadow.focus,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: dashboardV2Tokens.color.primary,
            borderWidth: 1,
          },
        },
        input: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          lineHeight: 1.35,
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
        },
        input: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          lineHeight: 1.35,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          lineHeight: 1.35,
          overflow: "visible",
          "&.MuiInputLabel-shrink": {
            lineHeight: 1.35,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
        },
        select: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          lineHeight: 1.35,
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: dashboardV2Tokens.radius.card,
          border: `1px solid ${dashboardV2Tokens.color.borderSubtle}`,
          backgroundColor: dashboardV2Tokens.color.surface,
          boxShadow: "none",
          transition: `background-color ${dashboardV2Tokens.motion.base}, border-color ${dashboardV2Tokens.motion.base}`,
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          height: 24,
          borderRadius: dashboardV2Tokens.radius.pill,
          fontWeight: 400,
          fontSize: 11,
          lineHeight: 1.45,
          backgroundColor: dashboardV2Tokens.color.surfaceMuted,
          border: `1px solid ${dashboardV2Tokens.color.borderSubtle}`,
          transition: `background-color ${dashboardV2Tokens.motion.base}, border-color ${dashboardV2Tokens.motion.base}`,
          "&:hover": {
            transform: "none",
            backgroundColor: dashboardV2Tokens.color.primarySubtle,
            boxShadow: "none",
          },
        },
        icon: {
          fontSize: 16,
        },
        label: {
          paddingLeft: 8,
          paddingRight: 8,
          lineHeight: 1.45,
          minHeight: 16,
          display: "inline-flex",
          alignItems: "center",
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: `${dashboardV2Tokens.radius.accordion}px !important`,
          boxShadow: "none",
          backgroundColor: dashboardV2Tokens.color.surface,
          transition: `border-color ${dashboardV2Tokens.motion.base}, background-color ${dashboardV2Tokens.motion.base}`,
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: 0,
            boxShadow: "none",
          },
          "&:hover": {
            borderColor: dashboardV2Tokens.color.borderStrong,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          minHeight: 34,
          padding: "0 10px",
          "&.Mui-expanded": {
            minHeight: 34,
          },
        },
        content: {
          margin: "8px 0",
          "&.Mui-expanded": {
            margin: "8px 0",
          },
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          padding: "0 10px 10px",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: dashboardV2Tokens.color.surface,
          },
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: dashboardV2Tokens.color.primary,
            opacity: 1,
          },
        },
        track: {
          backgroundColor: dashboardV2Tokens.color.scrollbar,
          opacity: 1,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: dashboardV2Tokens.color.borderSubtle,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginRight: 0,
          justifyContent: "space-between",
          gap: 16,
          width: "100%",
        },
        label: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          fontSize: 12,
          lineHeight: 1.45,
          color: dashboardV2Tokens.color.text,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: dashboardV2Tokens.color.primary,
          height: 2,
          padding: "6px 0",
        },
        rail: {
          backgroundColor: dashboardV2Tokens.color.border,
          opacity: 1,
        },
        thumb: {
          width: 12,
          height: 12,
          boxShadow: "none",
        },
        valueLabel: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          fontSize: 10,
        },
        markLabel: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          fontSize: 10,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 34,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 500,
          fontSize: 12,
          lineHeight: 1.25,
          minHeight: 32,
          textTransform: "none",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${dashboardV2Tokens.color.border}`,
          borderRadius: dashboardV2Tokens.radius.control,
          boxShadow: "0 10px 28px rgba(15,23,42,.10)",
          backgroundImage: "none",
          overflow: "visible",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        root: {
          zIndex: dashboardV2Tokens.zIndex.popover,
        },
        paper: {
          border: `1px solid ${dashboardV2Tokens.color.border}`,
          borderRadius: dashboardV2Tokens.radius.control,
          boxShadow: "0 10px 28px rgba(15,23,42,.10)",
          backgroundImage: "none",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          minHeight: 32,
          fontSize: 12,
          lineHeight: 1.45,
          "&:hover": {
            backgroundColor: dashboardV2Tokens.color.primarySubtle,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          fontFamily: dashboardFontFamily,
          borderRadius: dashboardV2Tokens.radius.dialog,
          boxShadow: dashboardV2Tokens.shadow.dialog,
          backgroundImage: "none",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: dashboardFontFamily,
          borderRadius: dashboardV2Tokens.radius.control,
          fontSize: 11,
          fontWeight: 400,
          lineHeight: 1.45,
          backgroundColor: "#111827",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          borderRadius: dashboardV2Tokens.radius.control,
          border: `1px solid ${dashboardV2Tokens.color.border}`,
          boxShadow: "none",
          fontSize: 12,
          lineHeight: 1.55,
          padding: "6px 10px",
        },
        icon: {
          fontSize: 16,
          padding: "2px 0",
          marginRight: 8,
        },
        message: {
          padding: 0,
        },
        action: {
          padding: 0,
          marginRight: -4,
        },
        standardSuccess: {
          backgroundColor: dashboardV2Tokens.color.surface,
          color: dashboardV2Tokens.color.text,
          "& .MuiAlert-icon": {
            color: dashboardV2Tokens.color.success,
          },
        },
        standardInfo: {
          backgroundColor: dashboardV2Tokens.color.primarySubtle,
          color: dashboardV2Tokens.color.text,
          borderColor: dashboardV2Tokens.color.borderSubtle,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          fontWeight: 400,
          lineHeight: 1.45,
        },
        head: {
          fontWeight: 500,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: dashboardFontFamily,
          padding: "20px 20px 8px",
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.35,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "8px 20px 16px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "12px 20px 20px",
          gap: 8,
        },
      },
    },
  },
});
