export const CHARTJS_COLORS = {
  red: "rgb(255, 99, 132)",
  orange: "rgb(255, 159, 64)",
  yellow: "rgb(255, 205, 86)",
  green: "rgb(75, 192, 192)",
  blue: "rgb(54, 162, 235)",
  purple: "rgb(153, 102, 255)",
  grey: "rgb(201, 203, 207)",
};

export const CHARTJS_TRANSPARENT_COLORS = {
  red: "rgba(255, 99, 132, 0.35)",
  orange: "rgba(255, 159, 64, 0.35)",
  yellow: "rgba(255, 205, 86, 0.35)",
  green: "rgba(75, 192, 192, 0.35)",
  blue: "rgba(54, 162, 235, 0.35)",
  purple: "rgba(153, 102, 255, 0.35)",
  grey: "rgba(201, 203, 207, 0.35)",
};

export const chartJsPalette = Object.values(CHARTJS_COLORS);
export const chartJsTransparentPalette = Object.values(CHARTJS_TRANSPARENT_COLORS);
export const NAMED_CHART_PALETTES = {
  chartjs: chartJsPalette,
  ocean: [
    "rgb(14, 116, 144)",
    "rgb(6, 182, 212)",
    "rgb(37, 99, 235)",
    "rgb(56, 189, 248)",
    "rgb(20, 184, 166)",
    "rgb(15, 118, 110)",
  ],
  earth: [
    "rgb(120, 53, 15)",
    "rgb(161, 98, 7)",
    "rgb(21, 128, 61)",
    "rgb(113, 63, 18)",
    "rgb(180, 83, 9)",
    "rgb(22, 101, 52)",
  ],
  sunset: [
    "rgb(234, 88, 12)",
    "rgb(239, 68, 68)",
    "rgb(217, 70, 239)",
    "rgb(244, 114, 182)",
    "rgb(249, 115, 22)",
    "rgb(251, 146, 60)",
  ],
  neutral: [
    "rgb(15, 23, 42)",
    "rgb(51, 65, 85)",
    "rgb(71, 85, 105)",
    "rgb(100, 116, 139)",
    "rgb(148, 163, 184)",
    "rgb(30, 41, 59)",
  ],
};

function toTransparent(color, alpha = 0.2) {
  const match = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  if (!match) return color;
  const [, red, green, blue] = match;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function pickChartColor(index = 0, alpha = null) {
  const baseColor = chartJsPalette[((index % chartJsPalette.length) + chartJsPalette.length) % chartJsPalette.length];
  return alpha == null ? baseColor : toTransparent(baseColor, alpha);
}

export function getChartPalette(alpha = null) {
  return chartJsPalette.map((color, index) => (alpha == null ? color : pickChartColor(index, alpha)));
}

export function getNamedChartPalette(name = "chartjs", alpha = null) {
  const palette = NAMED_CHART_PALETTES[name] ?? chartJsPalette;
  return palette.map((color) => (alpha == null ? color : toTransparent(color, alpha)));
}
