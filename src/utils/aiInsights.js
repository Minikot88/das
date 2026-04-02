function formatValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  return String(value ?? "");
}

function resolveNumericKey(rows = [], preferredKey = "") {
  if (!rows.length) return preferredKey || "";
  if (preferredKey && typeof rows[0]?.[preferredKey] === "number") return preferredKey;

  return Object.keys(rows[0]).find((key) => typeof rows[0]?.[key] === "number") ?? preferredKey ?? "";
}

export function analyzeChartData(chart, rows = []) {
  if (!rows.length) return null;

  const numericKey = resolveNumericKey(rows, chart?.y || chart?.yField || "value");
  if (!numericKey) return null;

  const numericRows = rows
    .map((row) => ({
      label: row[chart?.x || chart?.xField] ?? row.label ?? row.name ?? "Value",
      value: Number(row[numericKey]),
    }))
    .filter((row) => Number.isFinite(row.value));

  if (!numericRows.length) return null;

  const maxRow = numericRows.reduce((max, row) => (row.value > max.value ? row : max), numericRows[0]);
  const minRow = numericRows.reduce((min, row) => (row.value < min.value ? row : min), numericRows[0]);
  const first = numericRows[0].value;
  const last = numericRows[numericRows.length - 1].value;

  let trend = "flat";
  if (last > first) trend = "up";
  if (last < first) trend = "down";

  const trendLabel =
    trend === "up" ? "Upward trend" : trend === "down" ? "Downward trend" : "Stable trend";

  return {
    chartId: chart?.id ?? chart?.chartId,
    title: chart?.title ?? "Chart",
    max: `${formatValue(maxRow.value)} (${formatValue(maxRow.label)})`,
    min: `${formatValue(minRow.value)} (${formatValue(minRow.label)})`,
    trend,
    trendLabel,
  };
}
