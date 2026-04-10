export const CHART_PALETTES = {
  default: {
    label: "Default",
    single: "#2563eb",
    colors: ["#2563eb", "#06b6d4", "#7c3aed", "#10b981", "#f59e0b", "#ef4444"],
  },
  cool: {
    label: "Cool",
    single: "#2563eb",
    colors: ["#2563eb", "#0ea5e9", "#06b6d4", "#14b8a6", "#7c3aed", "#8b5cf6"],
  },
  warm: {
    label: "Warm",
    single: "#f97316",
    colors: ["#f97316", "#f59e0b", "#fb7185", "#ef4444", "#eab308", "#d97706"],
  },
  executive: {
    label: "Executive",
    single: "#1d4ed8",
    colors: ["#1d4ed8", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#334155"],
  },
  "echarts-classic": {
    label: "ECharts Classic",
    single: "#5470c6",
    colors: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4"],
  },
};

const ALIASES = {
  blue: "cool",
  green: "cool",
  vibrant: "default",
  pastel: "cool",
  dark: "executive",
  ocean: "executive",
  echarts: "echarts-classic",
};

export function getChartPalette(theme = "default") {
  const paletteKey = ALIASES[theme] ?? theme;
  return CHART_PALETTES[paletteKey] ?? CHART_PALETTES.default;
}
