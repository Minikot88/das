import React, { useMemo } from "react";

function formatValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value ?? "0";
  const digits = Math.abs(numeric) >= 1000000 ? 1 : 2;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(numeric);
}

function getNumericRows(rows = []) {
  if (!rows.length) return [];
  const firstRow = rows[0] ?? {};
  const numericKeys = Object.keys(firstRow).filter((key) => Number.isFinite(Number(firstRow[key])));
  const valueKey = numericKeys[0] ?? "value";

  return rows
    .map((row) => Number(row?.[valueKey]))
    .filter(Number.isFinite)
    .map((value) => ({ value }));
}

function getDateLikeKeys(row = {}) {
  return Object.keys(row).filter((key) => {
    const value = row?.[key];
    if (typeof value === "number") return false;
    if (typeof value !== "string") return false;
    return !Number.isNaN(Date.parse(value));
  });
}

function getTrendRows(rows = []) {
  if (!rows.length) return { current: 0, previous: null };
  const safeRows = rows.filter((row) => row && typeof row === "object");
  if (!safeRows.length) return { current: 0, previous: null };
  const firstRow = safeRows[0] ?? {};

  if (Number.isFinite(Number(firstRow.current)) || Number.isFinite(Number(firstRow.previous))) {
    return {
      current: Number(firstRow.current ?? firstRow.value ?? 0),
      previous: Number.isFinite(Number(firstRow.previous)) ? Number(firstRow.previous) : null,
      valueKey: firstRow.metric ?? "value",
    };
  }

  const valueKey = Object.keys(firstRow).find((key) => Number.isFinite(Number(firstRow[key]))) ?? "value";
  const dateKey = getDateLikeKeys(firstRow)[0] || getDateLikeKeys(safeRows[safeRows.length - 1] ?? {})[0];

  const orderedRows = dateKey
    ? [...safeRows].sort((a, b) => {
      const aDate = Date.parse(a?.[dateKey]);
      const bDate = Date.parse(b?.[dateKey]);
      if (!Number.isFinite(aDate) || !Number.isFinite(bDate)) return 0;
      return aDate - bDate;
    })
    : safeRows;

  const values = orderedRows
    .map((row) => Number(row?.[valueKey]))
    .filter(Number.isFinite);

  if (!values.length) return { current: 0, previous: null, valueKey };
  if (values.length === 1) return { current: values[0], previous: values[0], valueKey };
  return { current: values[values.length - 1], previous: values[values.length - 2], valueKey };
}

function formatTrendValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.0%";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

export default function KPIWidget({ chart = {}, className = "" }) {
  const rows = useMemo(
    () => Array.isArray(chart.rows)
      ? chart.rows
      : Array.isArray(chart.data)
        ? chart.data
        : Array.isArray(chart.config?.rows)
          ? chart.config.rows
          : [],
    [chart]
  );
  const metricRows = useMemo(() => getNumericRows(rows), [rows]);
  const metricValue = metricRows[0]?.value ?? 0;
  const trend = useMemo(() => getTrendRows(rows), [rows]);
  const safeTitle = chart.subtitle || chart.name || "KPI";
  const metricLabel = chart.title || "Metric";
  const comparisonText = Number.isFinite(trend.current) && Number.isFinite(trend.previous) && trend.previous !== 0
    ? `Compared to previous period (${trend.previous.toLocaleString("en-US")})`
    : "Compared to previous period";
  const trendDirection = Number.isFinite(trend.current) && Number.isFinite(trend.previous)
    ? trend.current >= trend.previous ? "up" : "down"
    : "flat";
  const percentChange = Number.isFinite(trend.current) && Number.isFinite(trend.previous)
    ? (trend.previous === 0 ? 0 : ((trend.current - trend.previous) / Math.abs(trend.previous)) * 100)
    : null;
  const statusText = rows.length ? "Live now" : "No rows";

  const dataSource = chart.dataset || chart.dataSource || chart.config?.dataset || "Unavailable";

  return (
    <div className={`kpi-widget bi-kpi-widget${className ? ` ${className}` : ""}`}>
      <div className="bi-kpi-top">
        <span className="bi-kpi-subtitle">{safeTitle}</span>
        <span className={`bi-kpi-badge ${trendDirection === "up" ? "is-up" : trendDirection === "down" ? "is-down" : "is-flat"}`}>{statusText}</span>
      </div>
      <strong className="bi-kpi-value">{formatValue(metricValue)}</strong>
      <div className="bi-kpi-title">{metricLabel}</div>
      <div className="bi-kpi-trend">
        <span className={`bi-kpi-trend-indicator ${trendDirection}`}>{trendDirection === "up" ? "▲" : trendDirection === "down" ? "▼" : "—"} {formatTrendValue(percentChange ?? 0)}</span>
        <span className="bi-kpi-comparison">{comparisonText}</span>
      </div>
      <div className="bi-kpi-meta">
        <span>Source: {dataSource}</span>
        <span>{rows.length ? `${rows.length} rows` : "No rows loaded"}</span>
      </div>
    </div>
  );
}
