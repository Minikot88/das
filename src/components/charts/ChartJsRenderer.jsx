import React, { useEffect, useMemo, useRef, useState } from "react";
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
  return JSON.parse(JSON.stringify(config));
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
  const isBuilderPreview = className.split(/\s+/).includes("is-builder-preview");
  const [darkBuilderPreview, setDarkBuilderPreview] = useState(
    () => isBuilderPreview && typeof document !== "undefined" && document.body.classList.contains("dark")
  );
  const resolvedConfig = useMemo(() => config ?? chart.config ?? null, [chart.config, config]);
  const configKey = useMemo(
    () => `${resolvedConfig ? JSON.stringify(resolvedConfig) : "empty-config"}:${darkBuilderPreview}`,
    [darkBuilderPreview, resolvedConfig]
  );

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

  useEffect(() => {
    if (!canvasRef.current || !resolvedConfig) return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setRenderError("Canvas context is unavailable.");
      return undefined;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    try {
      setRenderError("");
      const nextConfig = cloneConfig(resolvedConfig);
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
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [configKey, darkBuilderPreview, isBuilderPreview, onChartReady, resolvedConfig]);

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
      className={`chart-renderer-root chartjs-renderer${className ? ` ${className}` : ""}`}
      style={{ height: getHeightStyle(height) }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
