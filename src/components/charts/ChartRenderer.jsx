import React from "react";
import ChartErrorBoundary from "./ChartErrorBoundary";
import ChartJsRenderer from "./ChartJsRenderer";
import KPIWidget from "./KPIWidget";
import { mockSchema } from "../../data/mockSchema";
import {
  createCartesianConfig,
  createChartConfig,
  createPieLikeConfig,
  createRadialConfig,
} from "../../utils/chartFactory";

const FALLBACK_COLORS = ["#fb7185", "#fdba74", "#fde68a", "#60a5fa", "#a78bfa", "#34d399"];

function isRenderableChartJsConfig(config) {
  return Boolean(config?.data && Array.isArray(config.data.datasets));
}

function hasObjectValues(value) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length);
}

function getRenderableChartJsConfig(chart = {}, config = null) {
  if (isRenderableChartJsConfig(config)) return config;

  const templateId = chart.templateId ?? config?.meta?.templateId ?? config?.templateId;
  const rows = Array.isArray(chart.rows) && chart.rows.length
    ? chart.rows
    : Array.isArray(chart.data) && chart.data.length
      ? chart.data
      : Array.isArray(config?.rows) && config.rows.length
        ? config.rows
        : Array.isArray(config?.queryResult?.rows)
          ? config.queryResult.rows
          : [];
  const mapping = hasObjectValues(chart.mapping) ? chart.mapping : config?.mapping ?? {};
  const settings = hasObjectValues(chart.settings) ? chart.settings : config?.settings ?? {};

  if (!rows.length) return config;
  if (!templateId) return createFallbackChartJsConfig(chart, config, rows, settings);

  try {
    const generatedConfig = createChartConfig({
      templateId,
      rows,
      schema: chart.schema ?? config?.schema ?? mockSchema,
      mapping,
      settings,
    });
    return isRenderableChartJsConfig(generatedConfig)
      ? generatedConfig
      : createFallbackChartJsConfig(chart, config, rows, settings);
  } catch {
    return createFallbackChartJsConfig(chart, config, rows, settings);
  }
}

function createFallbackChartJsConfig(chart = {}, config = null, rows = [], settings = {}) {
  if (!rows.length) return config;

  const fields = Object.keys(rows[0] ?? {});
  const categoryField = fields.find((field) => typeof rows[0]?.[field] === "string") ?? fields[0];
  const valueField = fields.find((field) => typeof rows[0]?.[field] === "number") ?? fields.find((field) => field !== categoryField);
  if (!categoryField || !valueField) return config;

  const labels = rows.map((row) => row?.[categoryField] ?? "");
  const data = rows.map((row) => Number(row?.[valueField] ?? 0));
  const resolvedSettings = {
    showLegend: true,
    legendPosition: "bottom",
    showGrid: true,
    beginAtZero: true,
    ...settings,
    title: settings.title || chart.title || chart.name || config?.title || "",
  };
  const type = String(chart.type ?? config?.type ?? chart.family ?? "bar").toLowerCase();

  if (["pie", "doughnut", "donut"].includes(type)) {
    return createPieLikeConfig({
      type: type === "pie" ? "pie" : "doughnut",
      labels,
      datasets: [{
        label: valueField,
        data,
        backgroundColor: labels.map((_, index) => FALLBACK_COLORS[index % FALLBACK_COLORS.length]),
        borderColor: "#ffffff",
        borderWidth: 2,
      }],
      settings: resolvedSettings,
    });
  }

  if (["radar", "polararea", "polar-area"].includes(type)) {
    return createRadialConfig({
      type: type === "radar" ? "radar" : "polarArea",
      labels,
      datasets: [{
        label: valueField,
        data,
        backgroundColor: type === "radar" ? "rgba(251, 113, 133, 0.22)" : FALLBACK_COLORS,
        borderColor: "#fb7185",
        pointBackgroundColor: "#fb7185",
        borderWidth: 2,
      }],
      settings: resolvedSettings,
    });
  }

  return createCartesianConfig({
    type: type === "line" || type === "area" ? "line" : "bar",
    labels,
    datasets: [{
      type: type === "line" || type === "area" ? "line" : "bar",
      label: valueField,
      data,
      backgroundColor: type === "line" ? "rgba(251, 113, 133, 0.18)" : "#fb7185",
      borderColor: "#fb7185",
      borderWidth: 2,
      fill: type === "area",
    }],
    settings: resolvedSettings,
  });
}

export default function ChartRenderer({ chart = {}, config, containerHeight, height, className = "", onChartReady }) {
  const resolvedHeight = containerHeight ?? height ?? 320;
  const resolvedConfig = config ?? chart.config ?? null;
  const renderableConfig = getRenderableChartJsConfig(chart, resolvedConfig);

  if (chart.type === "kpi") {
    return (
      <ChartErrorBoundary>
        <KPIWidget chart={chart} className={className} />
      </ChartErrorBoundary>
    );
  }

  if (chart.engine === "chartjs" || renderableConfig) {
    return (
      <ChartErrorBoundary>
        <ChartJsRenderer
          chart={chart}
          config={renderableConfig}
          height={resolvedHeight}
          className={className}
          onChartReady={onChartReady}
        />
      </ChartErrorBoundary>
    );
  }

  return (
    <div className="chart-status-card">
      <span className="chart-status-kicker">Chart</span>
      <strong className="chart-status-title">Unsupported renderer</strong>
      <p className="chart-status-description">This chart does not have a supported rendering engine.</p>
    </div>
  );
}
