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
  const resolvedConfig = useMemo(() => config ?? chart.config ?? null, [chart.config, config]);
  const configKey = useMemo(
    () => (resolvedConfig ? JSON.stringify(resolvedConfig) : "empty-config"),
    [resolvedConfig]
  );

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
  }, [configKey, onChartReady, resolvedConfig]);

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
