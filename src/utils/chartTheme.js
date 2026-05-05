function createPluginTitleOptions(text = "", display = false, fontSize = 13, color = "#0f172a") {
  return {
    display: display && Boolean(text),
    text,
    align: "start",
    padding: { top: 0, bottom: 10 },
    color,
    font: {
      size: fontSize,
      weight: "600",
    },
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
} = {}) {
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
        position: legendPosition,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          color: axisLabelColor,
          font: {
            size: 11,
            weight: "600",
          },
        },
      },
      title: createPluginTitleOptions(title, true, 14, titleColor),
      subtitle: createPluginTitleOptions(subtitle, true, 11, axisLabelColor),
      tooltip: {
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
  backgroundColor = "#ffffff",
  titleColor = "#0f172a",
  axisLabelColor = "#475569",
  gridColor = "rgba(148, 163, 184, 0.14)",
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
    }),
    indexAxis: horizontal ? "y" : "x",
    scales: {
      x: {
        stacked,
        grid: {
          display: showGrid,
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: axisLabelColor,
          font: { size: 11, weight: "500" },
        },
      },
      y: {
        stacked,
        beginAtZero,
        grid: {
          display: showGrid,
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: axisLabelColor,
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
                color: gridColor,
                drawBorder: false,
              },
              ticks: {
                color: axisLabelColor,
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
    }),
    scales: {
      r: {
        beginAtZero,
        angleLines: {
          display: showGrid,
          color: gridColor,
        },
        grid: {
          display: showGrid,
          color: gridColor,
        },
        pointLabels: {
          color: axisLabelColor,
          font: {
            size: 11,
            weight: "600",
          },
        },
        ticks: {
          backdropColor: "rgba(255,255,255,0.85)",
          color: axisLabelColor,
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
    }),
    rotation: semi ? -90 : 0,
    circumference: semi ? 180 : 360,
    cutout: "58%",
  };
}
