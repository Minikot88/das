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
  nextConfig.options.responsive = true;
  nextConfig.options.maintainAspectRatio = false;
  nextConfig.options.resizeDelay = nextConfig.options.resizeDelay ?? 80;

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

let chartJsDetachedCanvasErrorGuardInstalled = false;

function installChartJsDetachedCanvasErrorGuard() {
  if (chartJsDetachedCanvasErrorGuardInstalled || typeof window === "undefined") return;
  chartJsDetachedCanvasErrorGuardInstalled = true;

  window.addEventListener("error", (event) => {
    const message = String(event.message ?? event.error?.message ?? "");
    const stack = String(event.error?.stack ?? "");
    const isChartJsDetachedCanvasResize =
      message.includes("ownerDocument") &&
      stack.includes("chart__js_auto");

    if (isChartJsDetachedCanvasResize) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

installChartJsDetachedCanvasErrorGuard();

export default function ChartJsRenderer({
  chart = {},
  config,
  height = 320,
  className = "",
  onChartReady,
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
      if (isBuilderPreview && darkBuilderPreview) {
        applyBuilderPreviewDarkTheme(nextConfig);
      }
      nextConfig.plugins = [...(nextConfig.plugins ?? []), canvasSurfacePlugin];
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
  }, [chart, chartKind, darkBuilderPreview, density, isBuilderPreview, onChartReady, resolvedConfig]);

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
