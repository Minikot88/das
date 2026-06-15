function createPluginTitleOptions(text = "", display = false, fontSize = 13, color = "#0f172a") {
  const safeText = typeof text === "string" ? text.trim() : "";
  return {
    display: display && Boolean(safeText),
    text: safeText,
    align: "start",
    padding: { top: 0, bottom: 10 },
    color,
    font: {
      size: fontSize,
      weight: "600",
    },
  };
}

function normalizeLegendPosition(position = "bottom") {
  const value = typeof position === "string" ? position.trim().toLowerCase() : "";
  if (["top", "bottom", "left", "right"].includes(value)) return value;
  return "bottom";
}

function parseColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  if (!value) return null;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map((char) => char + char).join("")
      : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    };
  }

  if (value === "white") return { r: 255, g: 255, b: 255 };
  if (value === "black") return { r: 0, g: 0, b: 0 };
  return null;
}

function getRelativeLuminance(color) {
  const rgb = parseColor(color);
  if (!rgb) return 1;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function isDarkBackground(color) {
  return getRelativeLuminance(color) < 0.38;
}

function isDefaultTitleColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "#0f172a" || value === "rgb(15, 23, 42)";
}

function isDefaultAxisColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "#475569" || value === "rgb(71, 85, 105)";
}

function isDefaultGridColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "rgba(148, 163, 184, 0.14)" || value === "rgba(148, 163, 184, 0.18)";
}

function resolveReadableColors({
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  gridColor = "",
} = {}) {
  const dark = isDarkBackground(backgroundColor);
  return {
    titleColor: isDefaultTitleColor(titleColor) ? (dark ? "#f8fafc" : "#0f172a") : titleColor,
    axisLabelColor: isDefaultAxisColor(axisLabelColor) ? (dark ? "#dbe7f3" : "#475569") : axisLabelColor,
    gridColor: isDefaultGridColor(gridColor) ? (dark ? "rgba(226, 232, 240, 0.18)" : "rgba(148, 163, 184, 0.14)") : gridColor,
    isDark: dark,
  };
}

function createScaleTitleOptions({ display = false, text = "", color = "#475569" } = {}) {
  const safeText = typeof text === "string" ? text.trim() : "";
  return {
    display: Boolean(display && safeText),
    text: safeText,
    color,
    font: {
      size: 12,
      weight: "600",
    },
    padding: { top: 10, bottom: 6 },
  };
}

export function createChartJsBaseOptions({
  title = "",
  subtitle = "",
  showLegend = true,
  legendPosition = "bottom",
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  showTooltip = true,
} = {}) {
  const safeLegendPosition = normalizeLegendPosition(legendPosition);
  const readable = resolveReadableColors({ backgroundColor, titleColor, axisLabelColor });
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 360,
      easing: "easeOutQuart",
    },
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    layout: {
      padding: 12,
    },
    plugins: {
      canvasSurface: {
        color: backgroundColor,
      },
      legend: {
        display: showLegend,
        position: safeLegendPosition,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          color: readable.axisLabelColor,
          font: {
            size: 11,
            weight: "600",
          },
        },
      },
      title: createPluginTitleOptions(title, true, 14, readable.titleColor),
      subtitle: createPluginTitleOptions(subtitle, true, 11, readable.titleColor),
      tooltip: {
        enabled: showTooltip,
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        usePointStyle: true,
      },
    },
  };
}

export function createCartesianOptions({
  title = "",
  subtitle = "",
  showLegend = true,
  legendPosition = "bottom",
  stacked = false,
  horizontal = false,
  beginAtZero = true,
  showGrid = true,
  secondaryAxis = false,
  showXAxisTitle = false,
  xAxisTitle = "",
  showYAxisTitle = false,
  yAxisTitle = "",
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  gridColor = "rgba(148, 163, 184, 0.14)",
  showTooltip = true,
} = {}) {
  const readable = resolveReadableColors({ backgroundColor, titleColor, axisLabelColor, gridColor });
  return {
    ...createChartJsBaseOptions({
      title,
      subtitle,
      showLegend,
      legendPosition,
      backgroundColor,
      titleColor,
      axisLabelColor,
      showTooltip,
    }),
    indexAxis: horizontal ? "y" : "x",
    scales: {
      x: {
        stacked,
        title: createScaleTitleOptions({
          display: showXAxisTitle,
          text: xAxisTitle,
          color: readable.axisLabelColor,
        }),
        grid: {
          display: showGrid,
          color: readable.gridColor,
          drawBorder: false,
        },
        ticks: {
          color: readable.axisLabelColor,
          font: { size: 11, weight: "500" },
        },
      },
      y: {
        stacked,
        beginAtZero,
        title: createScaleTitleOptions({
          display: showYAxisTitle,
          text: yAxisTitle,
          color: readable.axisLabelColor,
        }),
        grid: {
          display: showGrid,
          color: readable.gridColor,
          drawBorder: false,
        },
        ticks: {
          color: readable.axisLabelColor,
          font: { size: 11, weight: "500" },
        },
      },
      ...(secondaryAxis
        ? {
            y1: {
              position: "right",
              beginAtZero,
              grid: {
                drawOnChartArea: false,
                color: readable.gridColor,
                drawBorder: false,
              },
              ticks: {
                color: readable.axisLabelColor,
                font: { size: 11, weight: "500" },
              },
            },
          }
        : {}),
    },
  };
}

export function createRadialOptions({
  title = "",
  subtitle = "",
  showLegend = true,
  legendPosition = "bottom",
  beginAtZero = true,
  showGrid = true,
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  gridColor = "rgba(148, 163, 184, 0.18)",
  showTooltip = true,
} = {}) {
  const readable = resolveReadableColors({ backgroundColor, titleColor, axisLabelColor, gridColor });
  return {
    ...createChartJsBaseOptions({
      title,
      subtitle,
      showLegend,
      legendPosition,
      backgroundColor,
      titleColor,
      axisLabelColor,
      showTooltip,
    }),
    scales: {
      r: {
        beginAtZero,
        angleLines: {
          display: showGrid,
          color: readable.gridColor,
        },
        grid: {
          display: showGrid,
          color: readable.gridColor,
        },
        pointLabels: {
          color: readable.axisLabelColor,
          font: {
            size: 11,
            weight: "600",
          },
        },
        ticks: {
          backdropColor: readable.isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255,255,255,0.85)",
          color: readable.axisLabelColor,
          font: {
            size: 10,
          },
        },
      },
    },
  };
}

export function createPieOptions({
  title = "",
  subtitle = "",
  showLegend = true,
  legendPosition = "bottom",
  semi = false,
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  showTooltip = true,
} = {}) {
  return {
    ...createChartJsBaseOptions({
      title,
      subtitle,
      showLegend,
      legendPosition,
      backgroundColor,
      titleColor,
      axisLabelColor,
      showTooltip,
    }),
    rotation: semi ? -90 : 0,
    circumference: semi ? 180 : 360,
    cutout: "58%",
  };
}

