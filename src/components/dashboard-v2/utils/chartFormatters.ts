import type { ChartConfig, ChartSettings } from "@/components/dashboard-v2/types";

export const chartPalettes: Record<ChartSettings["colors"]["palette"], string[]> = {
  default: ["#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#06B6D4", "#64748B", "#EF4444"],
  business: ["#1D4ED8", "#0F766E", "#475569", "#7C3AED", "#B45309", "#155E75", "#166534", "#BE123C"],
  pastel: ["#93C5FD", "#A7F3D0", "#FDE68A", "#C4B5FD", "#A5F3FC", "#CBD5E1", "#FCA5A5", "#BBF7D0"],
  vivid: ["#2563EB", "#059669", "#EA580C", "#7C3AED", "#0891B2", "#65A30D", "#E11D48", "#DB2777"],
  monochrome: ["#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#64748B", "#CBD5E1"],
};

export const enterpriseChartTheme = {
  axisLabel: "#6B7280",
  axisLine: "#D8DEE8",
  gridLine: "#EEF2F7",
  title: "#111827",
  mutedText: "#6B7280",
  panel: "#FFFFFF",
  tooltipDark: "#111827",
  tooltipLight: "#FFFFFF",
  positive: "#16A34A",
  negative: "#EF4444",
};

export function formatValue(value: number, format: ChartConfig["settings"]["axis"]["numberFormat"] = "default") {
  if (format === "compact") {
    return Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (format === "currency") {
    return Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
  }
  if (format === "percent") {
    return Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1 }).format(value);
  }
  return Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

export function formatDateLabel(value: string | number | boolean | undefined, format: ChartConfig["settings"]["axis"]["dateFormat"]) {
  const source = String(value ?? "");
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source;

  if (format === "DD/MM/YYYY") {
    return Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }
  if (format === "MMM YYYY") {
    return Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric" }).format(date);
  }
  return Intl.DateTimeFormat("th-TH", { month: "short" }).format(date);
}

export function generateColors(settings: ChartSettings["colors"], count = 8) {
  const source = settings.seriesColors.length ? settings.seriesColors : chartPalettes[settings.palette];
  return Array.from({ length: Math.max(count, source.length) }, (_, index) => source[index % source.length]);
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
