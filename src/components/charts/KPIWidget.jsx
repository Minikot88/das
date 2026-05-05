import React, { useMemo } from "react";

function formatValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value ?? "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: numeric >= 100 ? 0 : 2,
  }).format(numeric);
}

function getFirstNumericValue(rows = []) {
  const firstRow = rows[0] ?? {};
  const firstNumericKey = Object.keys(firstRow).find((key) => Number.isFinite(Number(firstRow[key])));
  return {
    key: firstNumericKey ?? "value",
    value: firstNumericKey ? firstRow[firstNumericKey] : 0,
  };
}

export default function KPIWidget({ chart = {}, className = "" }) {
  const rows = Array.isArray(chart.rows)
    ? chart.rows
    : Array.isArray(chart.data)
      ? chart.data
      : Array.isArray(chart.config?.rows)
        ? chart.config.rows
        : [];
  const metric = useMemo(() => getFirstNumericValue(rows), [rows]);

  return (
    <div className={`kpi-widget${className ? ` ${className}` : ""}`}>
      <span className="kpi-label">{chart.subtitle || metric.key}</span>
      <strong className="kpi-value">{formatValue(metric.value)}</strong>
      <span>{chart.title || chart.name || "KPI"}</span>
    </div>
  );
}

