import type { ChartSettings } from "../types";
import type { DemoThemeId, DemoThemePreset } from "./demoTypes";

export const demoThemes: DemoThemePreset[] = [
  {
    id: "default-blue",
    name: "Default Blue",
    description: "ธีมสว่างมาตรฐานสำหรับรายงานทั่วไป",
    backgroundColor: "#FFFFFF",
    palette: "default",
    seriesColors: ["#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#06B6D4", "#64748B", "#EF4444"],
    gridColor: "#EEF2F7",
    gridOpacity: 45,
    tooltipTheme: "light",
    textColor: "#172033",
  },
  {
    id: "executive-dark",
    name: "Executive Dark",
    description: "คอนทราสต์สูงสำหรับโหมดนำเสนอผู้บริหาร",
    backgroundColor: "#0F172A",
    palette: "business",
    seriesColors: ["#60A5FA", "#F472B6", "#34D399", "#FBBF24", "#A78BFA", "#22D3EE", "#CBD5E1"],
    gridColor: "#334155",
    gridOpacity: 26,
    tooltipTheme: "dark",
    textColor: "#E5E7EB",
  },
  {
    id: "minimal-gray",
    name: "Minimal Gray",
    description: "เรียบ เงียบ เหมาะกับ dashboard เชิงปฏิบัติการ",
    backgroundColor: "#FFFFFF",
    palette: "monochrome",
    seriesColors: ["#111827", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB"],
    gridColor: "#E5E7EB",
    gridOpacity: 34,
    tooltipTheme: "light",
    textColor: "#111827",
  },
  {
    id: "business-green",
    name: "Business Green",
    description: "เน้นผลประกอบการ กำไร และการเติบโต",
    backgroundColor: "#FFFFFF",
    palette: "business",
    seriesColors: ["#059669", "#2563EB", "#84CC16", "#F59E0B", "#0F766E", "#64748B"],
    gridColor: "#E7F6EE",
    gridOpacity: 42,
    tooltipTheme: "light",
    textColor: "#172033",
  },
  {
    id: "premium-purple",
    name: "Premium Purple",
    description: "เหมาะกับเดโมเชิงผลิตภัณฑ์และรายงานเชิงกลยุทธ์",
    backgroundColor: "#FFFFFF",
    palette: "pastel",
    seriesColors: ["#7C3AED", "#2563EB", "#EC4899", "#14B8A6", "#F59E0B", "#64748B"],
    gridColor: "#F0EAFE",
    gridOpacity: 38,
    tooltipTheme: "light",
    textColor: "#172033",
  },
  {
    id: "warm-orange",
    name: "Warm Orange",
    description: "เหมาะกับการเล่าเรื่องแคมเปญและยอดขายรายช่องทาง",
    backgroundColor: "#FFFFFF",
    palette: "vivid",
    seriesColors: ["#EA580C", "#2563EB", "#F97316", "#16A34A", "#EF4444", "#64748B"],
    gridColor: "#FFF1E8",
    gridOpacity: 42,
    tooltipTheme: "light",
    textColor: "#172033",
  },
];

export function getDemoTheme(themeId: DemoThemeId) {
  return demoThemes.find((theme) => theme.id === themeId) ?? demoThemes[0];
}

export function applyThemeToSettings(settings: ChartSettings, themeId: DemoThemeId): ChartSettings {
  const theme = getDemoTheme(themeId);

  return {
    ...settings,
    general: {
      ...settings.general,
      themePreset: theme.id,
      backgroundColor: theme.backgroundColor,
    },
    labels: {
      ...settings.labels,
      color: theme.textColor,
    },
    colors: {
      ...settings.colors,
      palette: theme.palette,
      seriesColors: theme.seriesColors,
      borderColor: theme.backgroundColor === "#0F172A" ? "#1E293B" : "#ECEFF5",
    },
    grid: {
      ...settings.grid,
      color: theme.gridColor,
      opacity: theme.gridOpacity,
    },
    tooltip: {
      ...settings.tooltip,
      theme: theme.tooltipTheme,
    },
  };
}
