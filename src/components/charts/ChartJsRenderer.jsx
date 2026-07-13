import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

const canvasSurfacePlugin = {
  id: "canvasSurface",
  beforeDraw(chart, _args, options) {
    if (!options?.color) return;
    const { ctx, canvas } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
};

const builderAnalyticsPlugin = {
  id: "builderAnalytics",
  beforeDatasetsDraw(chart, _args, options = {}) {
    const bands = Array.isArray(options.bands) ? options.bands : [];
    if (!bands.length) return;
    const horizontal = chart.options?.indexAxis === "y";
    const valueScale = horizontal ? chart.scales?.x : chart.scales?.y;
    const chartArea = chart.chartArea;
    if (!valueScale || !chartArea) return;

    const topValue = valueScale.max;
    chart.ctx.save();
    bands.forEach((band) => {
      const from = Number(band.from);
      const to = band.to == null ? topValue : Number(band.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return;
      chart.ctx.fillStyle = band.color || "rgba(148, 163, 184, 0.12)";
      if (horizontal) {
        const xLeft = valueScale.getPixelForValue(Math.min(from, to));
        const xRight = valueScale.getPixelForValue(Math.max(from, to));
        chart.ctx.fillRect(xLeft, chartArea.top, Math.max(1, xRight - xLeft), chartArea.bottom - chartArea.top);
      } else {
        const yTop = valueScale.getPixelForValue(Math.max(from, to));
        const yBottom = valueScale.getPixelForValue(Math.min(from, to));
        chart.ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, Math.max(1, yBottom - yTop));
      }
    });
    chart.ctx.restore();
  },
  afterDatasetsDraw(chart, _args, options = {}) {
    const lines = Array.isArray(options.lines) ? options.lines : [];
    if (!lines.length) return;
    const horizontal = chart.options?.indexAxis === "y";
    const valueScale = horizontal ? chart.scales?.x : chart.scales?.y;
    const chartArea = chart.chartArea;
    if (!valueScale || !chartArea) return;

    chart.ctx.save();
    lines.forEach((line) => {
      const value = Number(line.value);
      if (!Number.isFinite(value)) return;
      const pixel = valueScale.getPixelForValue(value);
      if (!Number.isFinite(pixel)) return;
      chart.ctx.beginPath();
      chart.ctx.setLineDash(Array.isArray(line.dash) ? line.dash : []);
      chart.ctx.strokeStyle = line.color || "#64748b";
      chart.ctx.lineWidth = 2;
      if (horizontal) {
        chart.ctx.moveTo(pixel, chartArea.top);
        chart.ctx.lineTo(pixel, chartArea.bottom);
      } else {
        chart.ctx.moveTo(chartArea.left, pixel);
        chart.ctx.lineTo(chartArea.right, pixel);
      }
      chart.ctx.stroke();
      chart.ctx.setLineDash([]);
      if (line.label) {
        chart.ctx.font = "600 11px system-ui, sans-serif";
        chart.ctx.fillStyle = line.color || "#64748b";
        chart.ctx.textBaseline = horizontal ? "top" : "bottom";
        chart.ctx.fillText(String(line.label), horizontal ? pixel + 6 : chartArea.left + 8, horizontal ? chartArea.top + 4 : pixel - 4);
      }
    });
    chart.ctx.restore();
  },
};

function cloneConfig(config) {
  if (typeof structuredClone === "function") {
    return structuredClone(config);
  }
  return { ...config, options: { ...(config?.options ?? {}) } };
}

function isDefaultLightSurface(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "white" || value === "#fff" || value === "#ffffff" || value === "rgb(255, 255, 255)";
}

function isDefaultTitleColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "#0f172a" || value === "rgb(15, 23, 42)";
}

function isDefaultAxisColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
  return !value || value === "#475569" || value === "rgb(71, 85, 105)";
}

function parseColor(color) {
  const value = String(color ?? "").trim().toLowerCase();
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
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  if (value === "white") return { r: 255, g: 255, b: 255 };
  if (value === "black") return { r: 0, g: 0, b: 0 };
  return null;
}

function isDarkBackground(color) {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance < 0.38;
}

function applyReadableChartColors(config) {
  const nextConfig = config;
  const background = nextConfig.options?.plugins?.canvasSurface?.color ?? "#ffffff";
  const dark = isDarkBackground(background);
  const titleColor = dark ? "#f8fafc" : "#0f172a";
  const axisColor = dark ? "#dbe7f3" : "#475569";
  const gridColor = dark ? "rgba(226, 232, 240, 0.18)" : "rgba(148, 163, 184, 0.14)";

  nextConfig.options = nextConfig.options ?? {};
  nextConfig.options.plugins = nextConfig.options.plugins ?? {};

  const title = nextConfig.options.plugins.title;
  if (title && isDefaultTitleColor(title.color)) title.color = titleColor;

  const subtitle = nextConfig.options.plugins.subtitle;
  if (subtitle && (isDefaultAxisColor(subtitle.color) || isDefaultTitleColor(subtitle.color))) subtitle.color = titleColor;

  const legendLabels = nextConfig.options.plugins.legend?.labels;
  if (legendLabels && isDefaultAxisColor(legendLabels.color)) legendLabels.color = axisColor;

  Object.values(nextConfig.options.scales ?? {}).forEach((scale) => {
    if (scale?.title && isDefaultAxisColor(scale.title.color)) scale.title.color = axisColor;
    if (scale?.ticks && isDefaultAxisColor(scale.ticks.color)) scale.ticks.color = axisColor;
    if (scale?.pointLabels && isDefaultAxisColor(scale.pointLabels.color)) scale.pointLabels.color = axisColor;
    if (scale?.grid) scale.grid.color = gridColor;
    if (scale?.angleLines) scale.angleLines.color = gridColor;
    if (scale?.ticks && "backdropColor" in scale.ticks) {
      scale.ticks.backdropColor = dark ? "rgba(15, 23, 42, 0.72)" : "rgba(255,255,255,0.85)";
    }
  });

  return nextConfig;
}

function applyBuilderPreviewDarkTheme(config) {
  const nextConfig = config;
  nextConfig.options = nextConfig.options ?? {};
  nextConfig.options.plugins = nextConfig.options.plugins ?? {};

  const canvasSurface = nextConfig.options.plugins.canvasSurface ?? {};
  if (isDefaultLightSurface(canvasSurface.color)) {
    canvasSurface.color = "#0b1220";
  }
  nextConfig.options.plugins.canvasSurface = canvasSurface;

  const legendLabels = nextConfig.options.plugins.legend?.labels;
  if (legendLabels && isDefaultAxisColor(legendLabels.color)) {
    legendLabels.color = "#cbd5e1";
  }

  const title = nextConfig.options.plugins.title;
  if (title && isDefaultTitleColor(title.color)) {
    title.color = "#f8fafc";
  }

  const subtitle = nextConfig.options.plugins.subtitle;
  if (subtitle && isDefaultAxisColor(subtitle.color)) {
    subtitle.color = "#cbd5e1";
  }

  Object.values(nextConfig.options.scales ?? {}).forEach((scale) => {
    if (scale?.title && isDefaultAxisColor(scale.title.color)) {
      scale.title.color = "#cbd5e1";
    }
    if (scale?.ticks && isDefaultAxisColor(scale.ticks.color)) {
      scale.ticks.color = "#cbd5e1";
    }
    if (scale?.grid) {
      scale.grid.color = "rgba(148, 163, 184, 0.2)";
    }
  });

  return nextConfig;
}

function getHeightStyle(height) {
  if (typeof height === "number") return `${height}px`;
  if (typeof height === "string" && height.trim()) return height;
  return "320px";
}

function getChartKind(config = {}) {
  const type = String(config?.type ?? "").toLowerCase();
  if (["pie", "doughnut", "polararea", "radar"].includes(type)) return "circular";
  return "axis";
}

function applyResponsiveOptions(config, chartKind, density = "normal") {
  const nextConfig = config;
  nextConfig.options = nextConfig.options ?? {};
  // This renderer owns resize scheduling below. Keeping Chart.js responsive mode
  // enabled installs a second observer that can fire after React detaches the
  // canvas during fast route transitions.
  nextConfig.options.responsive = false;
  nextConfig.options.maintainAspectRatio = false;

  nextConfig.options.layout = {
    ...(nextConfig.options.layout ?? {}),
    padding: nextConfig.options.layout?.padding ?? (density === "tiny" ? 2 : chartKind === "circular" ? 8 : 4),
  };

  const plugins = nextConfig.options.plugins ?? {};
  const legend = plugins.legend ?? {};
  const labels = legend.labels ?? {};

  if (density === "tiny") {
    nextConfig.options.plugins = {
      ...plugins,
      legend: {
        ...legend,
        display: chartKind === "axis" ? false : legend.display ?? false,
        position: legend.position ?? "bottom",
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 6,
          font: {
            size: 10,
            ...(labels.font ?? {}),
          },
          ...(labels ?? {}),
        },
      },
      title: {
        ...(plugins.title ?? {}),
        display: false,
      },
      subtitle: {
        ...(plugins.subtitle ?? {}),
        display: false,
      },
    };
  }

  if (density === "compact") {
    nextConfig.options.plugins = {
      ...plugins,
      legend: {
        ...legend,
        position: legend.position ?? "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 8,
          font: {
            size: 11,
            ...(labels.font ?? {}),
          },
          ...(labels ?? {}),
        },
      },
    };
  }

  Object.values(nextConfig.options.scales ?? {}).forEach((scale) => {
    if (scale?.title?.display) {
      scale.title.font = {
        ...(scale.title.font ?? {}),
        size: density === "tiny" ? 10 : density === "compact" ? 11 : 12,
        weight: "600",
      };
      scale.title.padding = density === "tiny"
        ? { top: 6, bottom: 2 }
        : density === "compact"
          ? { top: 8, bottom: 4 }
          : { top: 10, bottom: 6 };
    }
    if (!scale?.ticks) return;
    scale.ticks.autoSkip = scale.ticks.autoSkip ?? true;
    scale.ticks.maxRotation = 0;
    scale.ticks.minRotation = 0;
    if (density === "tiny") {
      scale.ticks.maxTicksLimit = Math.min(scale.ticks.maxTicksLimit ?? 4, 4);
      scale.ticks.font = {
        size: 9,
        ...(scale.ticks.font ?? {}),
      };
    } else if (density === "compact") {
      scale.ticks.maxTicksLimit = Math.min(scale.ticks.maxTicksLimit ?? 6, 6);
      scale.ticks.font = {
        size: 10,
        ...(scale.ticks.font ?? {}),
      };
    }
  });

  if (density === "tiny") {
    nextConfig.options.elements = {
      ...(nextConfig.options.elements ?? {}),
      point: {
        radius: 2,
        hoverRadius: 3,
        ...(nextConfig.options.elements?.point ?? {}),
      },
    };
  }

  if (chartKind === "circular") {
    const circularPlugins = nextConfig.options.plugins ?? {};
    const circularLegend = circularPlugins.legend ?? {};
    const circularLabels = circularLegend.labels ?? {};
    nextConfig.options.plugins = {
      ...circularPlugins,
      legend: {
        ...circularLegend,
        display: density === "tiny" ? false : circularLegend.display,
        position: density === "tiny" ? "bottom" : circularLegend.position ?? "bottom",
        labels: {
          boxWidth: density === "tiny" ? 8 : 10,
          boxHeight: density === "tiny" ? 8 : 10,
          padding: density === "tiny" ? 6 : 10,
          ...(circularLabels ?? {}),
        },
      },
    };
  }

  return nextConfig;
}

function getChartCardTitle(chart = {}) {
  const title = chart?.title ?? chart?.settings?.title ?? chart?.chartTitle;
  return typeof title === "string" ? title.trim() : "";
}

function applyCanvasTitleVisibility(config, chart = {}) {
  const nextConfig = config;
  nextConfig.options = nextConfig.options ?? {};
  nextConfig.options.plugins = nextConfig.options.plugins ?? {};
  const currentTitlePlugin = nextConfig.options.plugins.title ?? {};
  const currentSubtitlePlugin = nextConfig.options.plugins.subtitle ?? {};
  const safeTitle = getChartCardTitle(chart);
  const safeSubtitle = typeof (chart?.subtitle ?? chart?.settings?.subtitle ?? "") === "string"
    ? (chart.subtitle ?? chart.settings?.subtitle ?? "").trim()
    : "";
  const shouldShowTitleInCanvas = chart?.settings?.showTitle !== false && Boolean(safeTitle);

  nextConfig.options.plugins.title = {
    ...currentTitlePlugin,
    display: shouldShowTitleInCanvas,
    text: shouldShowTitleInCanvas ? safeTitle : "",
  };
  nextConfig.options.plugins.subtitle = {
    ...currentSubtitlePlugin,
    display: shouldShowTitleInCanvas && Boolean(safeSubtitle),
    text: shouldShowTitleInCanvas ? safeSubtitle : "",
  };

  return nextConfig;
}

function canUseCanvas(canvas) {
  return Boolean(canvas?.isConnected && canvas.parentElement && canvas.ownerDocument);
}

function destroyChart(chartInstance) {
  if (!chartInstance) return;

  try {
    chartInstance.destroy();
  } catch (error) {
    if (!String(error?.message ?? "").includes("ownerDocument")) {
      throw error;
    }
  }
}

export default function ChartJsRenderer({
  chart = {},
  config,
  height = 320,
  className = "",
  onChartReady,
  onDataPointClick,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [renderError, setRenderError] = useState("");
  const classTokens = className.split(/\s+/).filter(Boolean);
  const isBuilderPreview = classTokens.includes("is-builder-preview");
  const density = classTokens.includes("is-tiny-card") ? "tiny" : classTokens.includes("is-compact-card") ? "compact" : "normal";
  const [darkBuilderPreview, setDarkBuilderPreview] = useState(
    () => isBuilderPreview && typeof document !== "undefined" && document.body.classList.contains("dark")
  );
  const resolvedConfig = useMemo(() => config ?? chart.config ?? null, [chart.config, config]);
  const chartKind = useMemo(() => getChartKind(resolvedConfig), [resolvedConfig]);

  useEffect(() => {
    if (!isBuilderPreview || typeof document === "undefined") return undefined;

    const updatePreviewMode = () => {
      setDarkBuilderPreview(document.body.classList.contains("dark"));
    };
    const observer = new MutationObserver(updatePreviewMode);

    updatePreviewMode();
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [isBuilderPreview]);

  useLayoutEffect(() => {
    if (!canvasRef.current || !resolvedConfig) return undefined;

    const canvas = canvasRef.current;
    if (!canUseCanvas(canvas)) return undefined;

    const context = canvas.getContext("2d");
    if (!context) {
      setRenderError("Canvas context is unavailable.");
      return undefined;
    }

    if (chartRef.current) {
      destroyChart(chartRef.current);
      chartRef.current = null;
    }

    try {
      setRenderError("");
      const nextConfig = cloneConfig(resolvedConfig);
      applyResponsiveOptions(nextConfig, chartKind, density);
      applyCanvasTitleVisibility(nextConfig, chart);
      applyReadableChartColors(nextConfig);
      if (isBuilderPreview && darkBuilderPreview) {
        applyBuilderPreviewDarkTheme(nextConfig);
      }
      nextConfig.options.onClick = (event, elements, activeChart) => {
        if (!elements?.length) return;
        const element = elements[0];
        const label = activeChart?.data?.labels?.[element.index];
        const dataset = activeChart?.data?.datasets?.[element.datasetIndex];
        onDataPointClick?.({
          label,
          value: Array.isArray(dataset?.data) ? dataset.data[element.index] : undefined,
          datasetLabel: dataset?.label,
          datasetIndex: element.datasetIndex,
          index: element.index,
        });
      };
      nextConfig.plugins = [...(nextConfig.plugins ?? []), builderAnalyticsPlugin, canvasSurfacePlugin];
      chartRef.current = new Chart(context, nextConfig);
      onChartReady?.(chartRef.current);
    } catch (error) {
      setRenderError(error?.message || "Chart render failed.");
    }

    return () => {
      if (chartRef.current) {
        destroyChart(chartRef.current);
        chartRef.current = null;
      }
    };
  }, [chart, chartKind, darkBuilderPreview, density, isBuilderPreview, onChartReady, onDataPointClick, resolvedConfig]);

  useEffect(() => {
    if (!chartRef.current || !canUseCanvas(canvasRef.current)) return undefined;

    const frameId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (chartRef.current && canUseCanvas(canvas)) {
        try {
          chartRef.current.resize();
        } catch (error) {
          if (!String(error?.message ?? "").includes("ownerDocument")) {
            throw error;
          }
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [height]);

  useEffect(() => {
    const frame = canvasRef.current?.parentElement;
    if (!frame || typeof ResizeObserver === "undefined") return undefined;

    const resizeObserver = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!chartRef.current || !canUseCanvas(canvas)) return;
      try {
        chartRef.current.resize();
      } catch (error) {
        if (!String(error?.message ?? "").includes("ownerDocument")) {
          throw error;
        }
      }
    });

    resizeObserver.observe(frame);
    return () => resizeObserver.disconnect();
  }, []);

  if (!resolvedConfig) {
    return (
      <div className="chart-status-card">
        <span className="chart-status-kicker">Chart</span>
        <strong className="chart-status-title">No configuration</strong>
        <p className="chart-status-description">Map fields and generate a config to preview this chart.</p>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="chart-status-card is-error">
        <span className="chart-status-kicker">Chart</span>
        <strong className="chart-status-title">Render error</strong>
        <p className="chart-status-description">{renderError}</p>
      </div>
    );
  }

  return (
    <div
      className={`chart-renderer-root chartjs-renderer is-${chartKind}-chart${className ? ` ${className}` : ""}`}
      style={{ height: getHeightStyle(height) }}
    >
      <div className="chartjs-canvas-frame">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
