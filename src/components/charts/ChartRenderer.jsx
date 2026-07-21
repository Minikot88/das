import React from "react";
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";
import ChartJsRenderer from "@/components/charts/ChartJsRenderer";
import KPIWidget from "@/components/charts/KPIWidget";
import { mockSchema } from "@/data/mockSchema";
import {
  createCartesianConfig,
  createChartConfig,
  createPieLikeConfig,
  createRadialConfig,
} from "@/utils/chartFactory";

const FALLBACK_COLORS = ["#fb7185", "#fdba74", "#fde68a", "#60a5fa", "#a78bfa", "#34d399"];

function isRenderableChartJsConfig(config) {
  return Boolean(config?.data && Array.isArray(config.data.datasets));
}

function hasObjectValues(value) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length);
}

function getRenderableChartJsConfig(chart = {}, config = null) {
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

  if (!rows.length) return chart.filterMeta?.active ? null : config;
  if (!templateId) return isRenderableChartJsConfig(config) ? config : createFallbackChartJsConfig(chart, config, rows, settings);

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
    return isRenderableChartJsConfig(config) ? config : createFallbackChartJsConfig(chart, config, rows, settings);
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

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") {
    return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
  }
  return String(value);
}

function TableChart({ config = {}, height = 320, className = "" }) {
  const columns = Array.isArray(config.columns) ? config.columns : [];
  const rows = Array.isArray(config.rows) ? config.rows : [];

  return (
    <div className={`chart-table-wrap chart-table-renderer${className ? ` ${className}` : ""}`} style={{ height }}>
      <table className="chart-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${columns.map((column) => row?.[column.key]).join("|")}`}>
              {columns.map((column) => (
                <td key={column.key}>{formatCellValue(row?.[column.key])}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={Math.max(1, columns.length)}>ไม่มีข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HeatmapChart({ config = {}, height = 320, className = "" }) {
  const rows = Array.isArray(config.rows) ? config.rows : [];
  const columns = Array.isArray(config.columns) ? config.columns : [];
  const cells = Array.isArray(config.cells) ? config.cells : [];
  const min = Number(config.min ?? 0);
  const max = Number(config.max ?? 0);
  const range = Math.max(1, max - min);
  const cellMap = new Map(cells.map((cell) => [`${cell.row}::${cell.column}`, cell]));

  function getIntensity(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0.08, Math.min(1, (numeric - min) / range));
  }

  return (
    <div className={`chart-heatmap-renderer${className ? ` ${className}` : ""}`} style={{ minHeight: height }}>
      <div
        className="chart-heatmap-grid"
        style={{
          gridTemplateColumns: `minmax(96px, 0.8fr) repeat(${Math.max(1, columns.length)}, minmax(64px, 1fr))`,
        }}
      >
        <div className="chart-heatmap-axis-cell" />
        {columns.map((column) => (
          <div key={column} className="chart-heatmap-axis-cell">{column}</div>
        ))}
        {rows.map((rowLabel) => (
          <React.Fragment key={rowLabel}>
            <div className="chart-heatmap-axis-cell is-row">{rowLabel}</div>
            {columns.map((columnLabel) => {
              const cell = cellMap.get(`${rowLabel}::${columnLabel}`);
              const value = cell?.value ?? 0;
              const intensity = getIntensity(value);
              return (
                <div
                  key={`${rowLabel}-${columnLabel}`}
                  className="chart-heatmap-cell"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round(intensity * 82)}%, var(--surface) 18%)`,
                    color: intensity > 0.56 ? "#ffffff" : "var(--text-primary)",
                  }}
                  title={`${rowLabel} / ${columnLabel}: ${formatCellValue(value)}`}
                >
                  {formatCellValue(value)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ChartRenderer({ chart = {}, config, containerHeight, height, className = "", onChartReady, onDataPointClick }) {
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

  if (resolvedConfig?.type === "table" || chart.type === "table") {
    return (
      <ChartErrorBoundary>
        <TableChart config={resolvedConfig} height={resolvedHeight} className={className} />
      </ChartErrorBoundary>
    );
  }

  if (resolvedConfig?.type === "heatmap" || chart.type === "heatmap") {
    return (
      <ChartErrorBoundary>
        <HeatmapChart config={resolvedConfig} height={resolvedHeight} className={className} />
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
          onDataPointClick={onDataPointClick}
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
