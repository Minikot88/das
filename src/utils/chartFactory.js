import { getChartJsTemplateById } from "@/utils/chartTemplates.js";
import { validateChartMapping } from "@/utils/chartCompatibility.js";
import { createCartesianOptions, createPieOptions, createRadialOptions } from "@/utils/chartTheme.js";
import { chartJsPalette, getNamedChartPalette, pickChartColor } from "@/utils/chartPalette.js";

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function getMappingValue(mapping = {}, role) {
  return ensureArray(mapping?.[role])[0] ?? null;
}

function getMappingValues(mapping = {}, role) {
  return ensureArray(mapping?.[role]);
}

function getTemplateRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

function formatLabel(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function uniqueValues(rows = [], field) {
  return Array.from(new Set(rows.map((row) => formatLabel(row?.[field]))));
}

function createMeta(template, settings = {}) {
  const unifiedBackground = settings.backgroundColor ?? settings.cardBackground ?? "#ffffff";
  return {
    templateId: template.id,
    family: template.family,
    variant: template.variant,
    settings: {
      palette: settings.palette ?? "chartjs",
      backgroundColor: unifiedBackground,
      borderColor: settings.borderColor ?? "",
    },
  };
}

export function groupRowsByField(rows = [], field) {
  return rows.reduce((groups, row) => {
    const key = formatLabel(row?.[field]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
    return groups;
  }, new Map());
}

function numericValue(row, field) {
  const value = Number(row?.[field]);
  return Number.isFinite(value) ? value : 0;
}

export function aggregateRows(rows = [], field, aggregation = "sum") {
  if (aggregation === "count") return rows.length;
  const values = rows.map((row) => numericValue(row, field));
  if (!values.length) return 0;
  if (aggregation === "avg") {
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  }
  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(2));
}

export function createLabels(rows = [], field) {
  return uniqueValues(rows, field);
}

function createDatasetLabel(fieldName) {
  const fieldLabels = {
    sales: "ยอดขาย",
    profit: "กำไร",
    orders: "คำสั่งซื้อ",
    quantity: "จำนวน",
    discount: "ส่วนลด",
    target: "เป้าหมาย",
    cost: "ต้นทุน",
    rating: "คะแนน",
    minRange: "ช่วงต่ำสุด",
    maxRange: "ช่วงสูงสุด",
  };
  if (fieldLabels[fieldName]) return fieldLabels[fieldName];

  return String(fieldName)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function toTransparentColor(color, alpha = 0.24) {
  const rgbMatch = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const rgbaMatch = String(color).match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/i);
  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const hexMatch = String(color).match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const value = hexMatch[1].length === 3
      ? hexMatch[1].split("").map((part) => `${part}${part}`).join("")
      : hexMatch[1];
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return color;
}

function normalizeDatasetColors(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

function getAppearancePalette(settings = {}, alpha = null) {
  const explicitColors = normalizeDatasetColors(settings.datasetColors);
  if (explicitColors.length) {
    return explicitColors.map((color) => (alpha == null ? color : toTransparentColor(color, alpha)));
  }
  return getNamedChartPalette(settings.palette ?? "chartjs", alpha);
}

function getDatasetStrokeColor(settings = {}, index = 0) {
  const palette = getAppearancePalette(settings);
  return settings.borderColor || palette[index % palette.length] || pickChartColor(index);
}

export function createDataset({
  label,
  data,
  index = 0,
  type,
  fill = false,
  stack = null,
  yAxisID = "y",
  hidden = false,
}) {
  const borderColor = pickChartColor(index);
  const backgroundColor = pickChartColor(index, type === "line" ? 0.18 : 0.72);

  return {
    label,
    data,
    type,
    borderColor,
    backgroundColor,
    borderWidth: 2,
    hidden,
    fill,
    stack,
    yAxisID,
    pointRadius: type === "line" ? 2.5 : undefined,
    tension: type === "line" ? 0.35 : undefined,
  };
}

function buildCategoryDatasets({ rows, categoryField, valueField, seriesField, aggregation, multipleMeasures = [] }) {
  const labels = createLabels(rows, categoryField);

  if (seriesField) {
    const seriesNames = uniqueValues(rows, seriesField);
    return {
      labels,
      datasets: seriesNames.map((seriesName, index) => {
        const seriesRows = rows.filter((row) => formatLabel(row?.[seriesField]) === seriesName);
        const data = labels.map((label) =>
          aggregateRows(
            seriesRows.filter((row) => formatLabel(row?.[categoryField]) === label),
            valueField,
            aggregation
          )
        );
        return createDataset({ label: seriesName, data, index, type: "bar" });
      }),
    };
  }

  if (multipleMeasures.length > 1) {
    return {
      labels,
      datasets: multipleMeasures.map((measure, index) => {
        const data = labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[categoryField]) === label),
            measure,
            aggregation
          )
        );
        return createDataset({
          label: createDatasetLabel(measure),
          data,
          index,
          type: "line",
        });
      }),
    };
  }

  return {
    labels,
    datasets: [
      createDataset({
        label: createDatasetLabel(valueField),
        data: labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[categoryField]) === label),
            valueField,
            aggregation
          )
        ),
        index: 0,
        type: "bar",
      }),
    ],
  };
}

function buildFloatingDatasets({ rows, categoryField, minField, maxField, seriesField, aggregation }) {
  const labels = createLabels(rows, categoryField);
  const seriesNames = seriesField ? uniqueValues(rows, seriesField) : [createDatasetLabel(maxField)];
  const datasets = seriesNames.map((seriesName, index) => {
    const scopedRows = seriesField
      ? rows.filter((row) => formatLabel(row?.[seriesField]) === seriesName)
      : rows;
    const data = labels.map((label) => {
      const bucket = scopedRows.filter((row) => formatLabel(row?.[categoryField]) === label);
      return [
        aggregateRows(bucket, minField, aggregation),
        aggregateRows(bucket, maxField, aggregation),
      ];
    });
    return createDataset({ label: seriesName, data, index, type: "bar" });
  });

  return { labels, datasets };
}

function buildPieDatasets({ rows, labelField, valueField, aggregation, measures = [] }) {
  const labels = createLabels(rows, labelField);

  if (measures.length > 1) {
    return {
      labels,
      datasets: measures.map((measure, index) => ({
        label: createDatasetLabel(measure),
        data: labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[labelField]) === label),
            measure,
            aggregation
          )
        ),
        borderColor: getNamedChartPalette("chartjs")[index % chartJsPalette.length],
        backgroundColor: labels.map((_, colorIndex) => pickChartColor(colorIndex, 0.76)),
        borderWidth: 2,
      })),
    };
  }

  return {
    labels,
    datasets: [
      {
        label: createDatasetLabel(valueField),
        data: labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[labelField]) === label),
            valueField,
            aggregation
          )
        ),
        backgroundColor: labels.map((_, index) => pickChartColor(index, 0.82)),
        borderColor: labels.map((_, index) => pickChartColor(index)),
        borderWidth: 2,
      },
    ],
  };
}

function buildRadarDatasets({ rows, labelField, valueField, seriesField, measures = [], aggregation, fill = false }) {
  const labels = createLabels(rows, labelField);

  if (measures.length > 1) {
    return {
      labels,
      datasets: measures.map((measure, index) => {
        const borderColor = pickChartColor(index);
        return {
          label: createDatasetLabel(measure),
          data: labels.map((label) =>
            aggregateRows(
              rows.filter((row) => formatLabel(row?.[labelField]) === label),
              measure,
              aggregation
            )
          ),
          borderColor,
          backgroundColor: pickChartColor(index, fill ? 0.22 : 0.08),
          fill,
        };
      }),
    };
  }

  if (seriesField) {
    const seriesNames = uniqueValues(rows, seriesField);
    return {
      labels,
      datasets: seriesNames.map((seriesName, index) => {
        const borderColor = pickChartColor(index);
        return {
          label: seriesName,
          data: labels.map((label) =>
            aggregateRows(
              rows.filter(
                (row) =>
                  formatLabel(row?.[labelField]) === label &&
                  formatLabel(row?.[seriesField]) === seriesName
              ),
              valueField,
              aggregation
            )
          ),
          borderColor,
          backgroundColor: pickChartColor(index, fill ? 0.22 : 0.08),
          fill,
        };
      }),
    };
  }

  return {
    labels,
    datasets: [
      {
        label: createDatasetLabel(valueField),
        data: labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[labelField]) === label),
            valueField,
            aggregation
          )
        ),
        borderColor: pickChartColor(0),
        backgroundColor: pickChartColor(0, fill ? 0.22 : 0.08),
        fill,
      },
    ],
  };
}

function buildScatterDatasets({ rows, xField, yField, seriesField }) {
  const seriesNames = seriesField ? uniqueValues(rows, seriesField) : ["Series 1"];
  return seriesNames.map((seriesName, index) => {
    const scopedRows = seriesField
      ? rows.filter((row) => formatLabel(row?.[seriesField]) === seriesName)
      : rows;
    return {
      label: seriesName,
      data: scopedRows.map((row) => ({
        x: numericValue(row, xField),
        y: numericValue(row, yField),
      })),
      borderColor: pickChartColor(index),
      backgroundColor: pickChartColor(index, 0.72),
    };
  });
}

function buildBubbleDatasets({ rows, xField, yField, sizeField, seriesField }) {
  const seriesNames = seriesField ? uniqueValues(rows, seriesField) : ["Series 1"];
  return seriesNames.map((seriesName, index) => {
    const scopedRows = seriesField
      ? rows.filter((row) => formatLabel(row?.[seriesField]) === seriesName)
      : rows;
    return {
      label: seriesName,
      data: scopedRows.map((row) => ({
        x: numericValue(row, xField),
        y: numericValue(row, yField),
        r: Math.max(6, Math.min(24, numericValue(row, sizeField) / 6)),
      })),
      borderColor: pickChartColor(index),
      backgroundColor: pickChartColor(index, 0.45),
    };
  });
}

function buildMixedDatasets({ rows, categoryField, barField, lineField, seriesField, aggregation, stacked = false, secondaryAxis = false }) {
  const labels = createLabels(rows, categoryField);
  const datasets = [];

  if (stacked && seriesField) {
    uniqueValues(rows, seriesField).forEach((seriesName, index) => {
      datasets.push({
        ...createDataset({
          label: seriesName,
          data: labels.map((label) =>
            aggregateRows(
              rows.filter(
                (row) =>
                  formatLabel(row?.[categoryField]) === label &&
                  formatLabel(row?.[seriesField]) === seriesName
              ),
              barField,
              aggregation
            )
          ),
          index,
          type: "bar",
          stack: "stack-0",
        }),
      });
    });
  } else {
    datasets.push(
      createDataset({
        label: createDatasetLabel(barField),
        data: labels.map((label) =>
          aggregateRows(
            rows.filter((row) => formatLabel(row?.[categoryField]) === label),
            barField,
            aggregation
          )
        ),
        index: 0,
        type: "bar",
      })
    );
  }

  datasets.push(
    createDataset({
      label: createDatasetLabel(lineField),
      data: labels.map((label) =>
        aggregateRows(
          rows.filter((row) => formatLabel(row?.[categoryField]) === label),
          lineField,
          aggregation
        )
      ),
      index: datasets.length,
      type: "line",
      yAxisID: secondaryAxis ? "y1" : "y",
    })
  );

  return { labels, datasets };
}

function normalizeAnalytics(settings = {}) {
  return {
    trend: {
      enabled: false,
      color: "#2563eb",
      label: "เส้นแนวโน้ม",
      ...(settings.analytics?.trend ?? {}),
    },
    target: {
      enabled: false,
      value: 1000000,
      label: "เป้าหมาย",
      color: "#22c55e",
      ...(settings.analytics?.target ?? {}),
    },
    threshold: {
      enabled: false,
      greenMin: 900000,
      yellowMin: 600000,
      redMin: 0,
      greenColor: "rgba(34, 197, 94, 0.12)",
      yellowColor: "rgba(245, 158, 11, 0.14)",
      redColor: "rgba(239, 68, 68, 0.12)",
      ...(settings.analytics?.threshold ?? {}),
    },
    forecast: {
      enabled: false,
      periods: 3,
      window: 3,
      color: "#7c3aed",
      label: "คาดการณ์",
      ...(settings.analytics?.forecast ?? {}),
    },
    reference: {
      enabled: false,
      mode: "static",
      value: 750000,
      label: "เส้นอ้างอิง",
      color: "#64748b",
      ...(settings.analytics?.reference ?? {}),
    },
  };
}

function isAnalyticsSupported(template) {
  return ["bar", "line", "area", "scatter"].includes(template?.family);
}

function firstNumericDataset(config = {}) {
  return (config.data?.datasets ?? []).find((dataset) =>
    Array.isArray(dataset.data) && dataset.data.some((value) =>
      typeof value === "number" || Number.isFinite(Number(value?.y))
    )
  );
}

function getDatasetYValues(dataset = {}) {
  return (dataset.data ?? [])
    .map((value) => (typeof value === "number" ? value : Number(value?.y)))
    .map((value) => (Number.isFinite(value) ? value : null));
}

function linearRegression(points = []) {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (valid.length < 2) return null;
  const n = valid.length;
  const sumX = valid.reduce((sum, point) => sum + point.x, 0);
  const sumY = valid.reduce((sum, point) => sum + point.y, 0);
  const sumXY = valid.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = valid.reduce((sum, point) => sum + point.x * point.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (!denominator) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function createLineOverlayDataset({ label, color, data, borderDash = [] }) {
  return {
    type: "line",
    label,
    data,
    borderColor: color,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderDash,
    pointRadius: 0,
    pointHoverRadius: 3,
    fill: false,
    tension: 0,
    order: 0,
  };
}

function addTrendDataset(config, analytics, template) {
  if (!analytics.trend.enabled) return config;
  const source = firstNumericDataset(config);
  if (!source) return config;

  if (template.family === "scatter") {
    const points = (source.data ?? [])
      .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    const regression = linearRegression(points);
    if (!regression || points.length < 2) return config;
    const sortedX = points.map((point) => point.x).sort((a, b) => a - b);
    const data = [sortedX[0], sortedX.at(-1)].map((x) => ({
      x,
      y: Number((regression.slope * x + regression.intercept).toFixed(2)),
    }));
    config.data.datasets.push(createLineOverlayDataset({
      label: analytics.trend.label,
      color: analytics.trend.color,
      data,
    }));
    return config;
  }

  const values = getDatasetYValues(source);
  const points = values.map((y, x) => ({ x, y })).filter((point) => Number.isFinite(point.y));
  const regression = linearRegression(points);
  if (!regression) return config;
  const data = values.map((_, index) => Number((regression.slope * index + regression.intercept).toFixed(2)));
  config.data.datasets.push(createLineOverlayDataset({
    label: analytics.trend.label,
    color: analytics.trend.color,
    data,
  }));
  return config;
}

function addForecastDataset(config, analytics, template) {
  if (!analytics.forecast.enabled || template.family === "scatter") return config;
  const source = firstNumericDataset(config);
  const labels = config.data?.labels;
  if (!source || !Array.isArray(labels)) return config;
  const values = getDatasetYValues(source).filter(Number.isFinite);
  if (values.length < 2) return config;

  const periods = Math.max(1, Math.min(12, Number(analytics.forecast.periods ?? 3)));
  const windowSize = Math.max(1, Math.min(values.length, Number(analytics.forecast.window ?? 3)));
  const projected = [];
  let working = values.slice();
  for (let index = 0; index < periods; index += 1) {
    const window = working.slice(-windowSize);
    const average = window.reduce((sum, value) => sum + value, 0) / window.length;
    const nextValue = Number(average.toFixed(2));
    projected.push(nextValue);
    working = [...working, nextValue];
  }

  const originalLength = labels.length;
  config.data.labels = [
    ...labels,
    ...projected.map((_, index) => `คาดการณ์ ${index + 1}`),
  ];
  config.data.datasets = config.data.datasets.map((dataset) => ({
    ...dataset,
    data: Array.isArray(dataset.data)
      ? [...dataset.data, ...Array(projected.length).fill(null)]
      : dataset.data,
  }));
  config.data.datasets.push(createLineOverlayDataset({
    label: analytics.forecast.label,
    color: analytics.forecast.color,
    borderDash: [6, 6],
    data: [...Array(Math.max(0, originalLength - 1)).fill(null), values.at(-1), ...projected],
  }));
  return config;
}

function resolveDynamicReferenceValue(config = {}, mode = "static", fallback = 0) {
  if (mode !== "average") return Number(fallback);
  const source = firstNumericDataset(config);
  const values = getDatasetYValues(source).filter(Number.isFinite);
  if (!values.length) return Number(fallback);
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function attachAnalyticsPluginOptions(config, analytics) {
  config.options = config.options ?? {};
  config.options.plugins = config.options.plugins ?? {};
  const lines = [];
  if (analytics.target.enabled && Number.isFinite(Number(analytics.target.value))) {
    lines.push({
      value: Number(analytics.target.value),
      label: analytics.target.label,
      color: analytics.target.color,
      dash: [4, 4],
    });
  }
  if (analytics.reference.enabled) {
    const value = resolveDynamicReferenceValue(config, analytics.reference.mode, analytics.reference.value);
    if (Number.isFinite(value)) {
      lines.push({
        value,
        label: analytics.reference.label,
        color: analytics.reference.color,
        dash: analytics.reference.mode === "average" ? [2, 4] : [],
      });
    }
  }

  const bands = analytics.threshold.enabled
    ? [
        { from: Number(analytics.threshold.redMin), to: Number(analytics.threshold.yellowMin), color: analytics.threshold.redColor },
        { from: Number(analytics.threshold.yellowMin), to: Number(analytics.threshold.greenMin), color: analytics.threshold.yellowColor },
        { from: Number(analytics.threshold.greenMin), to: null, color: analytics.threshold.greenColor },
      ]
    : [];

  config.options.plugins.builderAnalytics = { lines, bands };
  return config;
}

function applyAnalytics(config, template, settings = {}) {
  if (!isAnalyticsSupported(template)) return config;
  const analytics = normalizeAnalytics(settings);
  addTrendDataset(config, analytics, template);
  addForecastDataset(config, analytics, template);
  attachAnalyticsPluginOptions(config, analytics);
  return config;
}

function getFieldLabel(schema, fieldName) {
  const field = Array.isArray(schema?.fields)
    ? schema.fields.find((item) => item.name === fieldName)
    : null;
  return field?.label || createDatasetLabel(fieldName);
}

function buildTableConfig({ rows, schema, columns = [], settings = {} }) {
  const selectedColumns = columns.length
    ? columns
    : Object.keys(rows[0] ?? {}).slice(0, 6);
  return {
    type: "table",
    columns: selectedColumns.map((key) => ({
      key,
      label: getFieldLabel(schema, key),
    })),
    rows: rows.slice(0, Number(settings.pageSize ?? 100)),
    totalRows: rows.length,
  };
}

function buildKpiRows({ rows, valueField, labelField, aggregation }) {
  const value = aggregateRows(rows, valueField, aggregation);
  const grouped = labelField ? groupRowsByField(rows, labelField) : null;
  const groupedValues = grouped
    ? Array.from(grouped.entries()).map(([label, scopedRows]) => ({
        label,
        value: aggregateRows(scopedRows, valueField, aggregation),
      }))
    : [];
  const previous = groupedValues.length > 1 ? groupedValues[groupedValues.length - 2]?.value : null;
  const current = groupedValues.length ? groupedValues[groupedValues.length - 1]?.value : value;
  return [{
    label: labelField || valueField,
    value,
    current,
    previous,
    metric: valueField,
  }];
}

function buildHeatmapConfig({ rows, rowField, columnField, valueField, aggregation }) {
  const rowLabels = createLabels(rows, rowField);
  const columnLabels = createLabels(rows, columnField);
  const cells = rowLabels.flatMap((rowLabel) =>
    columnLabels.map((columnLabel) => {
      const bucket = rows.filter(
        (row) =>
          formatLabel(row?.[rowField]) === rowLabel &&
          formatLabel(row?.[columnField]) === columnLabel
      );
      return {
        row: rowLabel,
        column: columnLabel,
        value: aggregateRows(bucket, valueField, aggregation),
      };
    })
  );
  const values = cells.map((cell) => cell.value).filter(Number.isFinite);
  return {
    type: "heatmap",
    rows: rowLabels,
    columns: columnLabels,
    cells,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  };
}

function applyDatasetAppearance(datasets = [], settings = {}, fallbackType = "bar") {
  const palette = getAppearancePalette(settings);
  const transparentPalette = getAppearancePalette(settings, 0.76);
  const lineWidth = Number(settings.lineWidth ?? 2);
  const barBorderRadius = Number(settings.barBorderRadius ?? 8);

  return datasets.map((dataset, index) => {
    const datasetType = dataset.type ?? fallbackType;
    const strokeColor = getDatasetStrokeColor(settings, index);
    const fillColor = transparentPalette[index % transparentPalette.length] ?? toTransparentColor(strokeColor, 0.72);

    if (["pie", "doughnut", "polarArea"].includes(datasetType)) {
      const values = Array.isArray(dataset.data) ? dataset.data : [];
      return {
        ...dataset,
        backgroundColor: values.map((_, colorIndex) => transparentPalette[(index + colorIndex) % transparentPalette.length]),
        borderColor: values.map((_, colorIndex) => settings.borderColor || palette[(index + colorIndex) % palette.length]),
        borderWidth: Math.max(1, lineWidth),
      };
    }

    if (datasetType === "bar") {
      return {
        ...dataset,
        backgroundColor: fillColor,
        borderColor: strokeColor,
        borderWidth: Math.max(1, lineWidth / 1.5),
        borderRadius: barBorderRadius,
        borderSkipped: false,
      };
    }

    if (datasetType === "line") {
      return {
        ...dataset,
        borderColor: strokeColor,
        backgroundColor: dataset.fill ? toTransparentColor(strokeColor, 0.2) : toTransparentColor(strokeColor, 0.08),
        pointBackgroundColor: strokeColor,
        pointBorderColor: strokeColor,
        pointHoverBackgroundColor: strokeColor,
        borderWidth: lineWidth,
      };
    }

    if (datasetType === "radar") {
      return {
        ...dataset,
        borderColor: strokeColor,
        backgroundColor: dataset.fill ? toTransparentColor(strokeColor, 0.2) : toTransparentColor(strokeColor, 0.08),
        pointBackgroundColor: strokeColor,
        borderWidth: lineWidth,
      };
    }

    if (datasetType === "scatter" || datasetType === "bubble") {
      return {
        ...dataset,
        borderColor: strokeColor,
        backgroundColor: toTransparentColor(strokeColor, datasetType === "bubble" ? 0.36 : 0.52),
        borderWidth: Math.max(1, lineWidth / 1.5),
      };
    }

    return {
      ...dataset,
      borderColor: strokeColor,
      backgroundColor: fillColor,
      borderWidth: Math.max(1, lineWidth),
    };
  });
}

function attachAppearance(config, template, settings = {}) {
  const nextConfig = {
    ...config,
    data: {
      ...(config.data ?? {}),
      datasets: applyDatasetAppearance(config.data?.datasets ?? [], settings, config.type),
    },
    options: {
      ...(config.options ?? {}),
      elements: {
        ...(config.options?.elements ?? {}),
        line: {
          ...(config.options?.elements?.line ?? {}),
          borderWidth: Number(settings.lineWidth ?? 2),
        },
        point: {
          ...(config.options?.elements?.point ?? {}),
          radius: 2.5,
          hoverRadius: 4,
        },
        bar: {
          ...(config.options?.elements?.bar ?? {}),
          borderRadius: Number(settings.barBorderRadius ?? 8),
          borderSkipped: false,
        },
        arc: {
          ...(config.options?.elements?.arc ?? {}),
          borderWidth: Math.max(1, Number(settings.lineWidth ?? 2)),
          borderColor: settings.borderColor || "#ffffff",
        },
      },
    },
    meta: createMeta(template, settings),
  };

  return nextConfig;
}

export function createCartesianConfig({ type, labels, datasets, settings = {} }) {
  return {
    type,
    data: { labels, datasets },
    options: createCartesianOptions({
      title: settings.title,
      subtitle: settings.subtitle,
      showLegend: settings.showLegend,
      legendPosition: settings.legendPosition,
      stacked: settings.stacked,
      horizontal: settings.horizontal,
      beginAtZero: settings.beginAtZero,
      showGrid: settings.showGrid,
      secondaryAxis: settings.useSecondaryAxis,
      showXAxisTitle: settings.showXAxisTitle,
      xAxisTitle: settings.xAxisTitle,
      showYAxisTitle: settings.showYAxisTitle,
      yAxisTitle: settings.yAxisTitle,
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
      showTooltip: settings.showTooltip !== false,
    }),
  };
}

export function createPieLikeConfig({ type, labels, datasets, settings = {} }) {
  return {
    type,
    data: { labels, datasets },
    options: {
      ...createPieOptions({
        title: settings.title,
        subtitle: settings.subtitle,
        showLegend: settings.showLegend,
        legendPosition: settings.legendPosition,
        semi: settings.semi,
        backgroundColor: settings.backgroundColor,
        titleColor: settings.titleColor,
        axisLabelColor: settings.axisLabelColor,
        showTooltip: settings.showTooltip !== false,
      }),
      cutout: settings.cutout ?? (type === "doughnut" ? "58%" : undefined),
    },
  };
}

export function createRadialConfig({ type, labels, datasets, settings = {} }) {
  return {
    type,
    data: { labels, datasets },
    options: createRadialOptions({
      title: settings.title,
      subtitle: settings.subtitle,
      showLegend: settings.showLegend,
      legendPosition: settings.legendPosition,
      beginAtZero: settings.beginAtZero,
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
      showGrid: settings.showGrid,
      showTooltip: settings.showTooltip !== false,
    }),
  };
}

export function createScatterConfig({ datasets, settings = {} }) {
  return {
    type: "scatter",
    data: { datasets },
    options: createCartesianOptions({
      title: settings.title,
      subtitle: settings.subtitle,
      showLegend: settings.showLegend,
      legendPosition: settings.legendPosition,
      beginAtZero: settings.beginAtZero,
      showGrid: settings.showGrid,
      showXAxisTitle: settings.showXAxisTitle,
      xAxisTitle: settings.xAxisTitle,
      showYAxisTitle: settings.showYAxisTitle,
      yAxisTitle: settings.yAxisTitle,
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
      showTooltip: settings.showTooltip !== false,
    }),
  };
}

export function createBubbleConfig({ datasets, settings = {} }) {
  return {
    type: "bubble",
    data: { datasets },
    options: createCartesianOptions({
      title: settings.title,
      subtitle: settings.subtitle,
      showLegend: settings.showLegend,
      legendPosition: settings.legendPosition,
      beginAtZero: settings.beginAtZero,
      showGrid: settings.showGrid,
      showXAxisTitle: settings.showXAxisTitle,
      xAxisTitle: settings.xAxisTitle,
      showYAxisTitle: settings.showYAxisTitle,
      yAxisTitle: settings.yAxisTitle,
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
      showTooltip: settings.showTooltip !== false,
    }),
  };
}

export function createMixedConfig({ labels, datasets, settings = {} }) {
  return {
    type: "bar",
    data: { labels, datasets },
    options: createCartesianOptions({
      title: settings.title,
      subtitle: settings.subtitle,
      showLegend: settings.showLegend,
      legendPosition: settings.legendPosition,
      stacked: settings.stacked,
      beginAtZero: settings.beginAtZero,
      showGrid: settings.showGrid,
      secondaryAxis: settings.useSecondaryAxis,
      showXAxisTitle: settings.showXAxisTitle,
      xAxisTitle: settings.xAxisTitle,
      showYAxisTitle: settings.showYAxisTitle,
      yAxisTitle: settings.yAxisTitle,
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
      showTooltip: settings.showTooltip !== false,
    }),
  };
}

function mergeSettings(template, settings = {}) {
  return {
    showGrid: true,
    palette: "chartjs",
    datasetColors: [],
    backgroundColor: "#ffffff",
    borderColor: "",
    titleColor: "#0f172a",
    axisLabelColor: "#475569",
    lineWidth: 2,
    barBorderRadius: 8,
    showTooltip: true,
    ...template.defaultSettings,
    ...settings,
  };
}

function finalizeConfig(config, template, rows, settings) {
  const withAnalytics = applyAnalytics(config, template, settings);
  return {
    ...attachAppearance(withAnalytics, template, settings),
    rows,
  };
}

export function createChartConfig({
  templateId,
  rows,
  schema,
  mapping = {},
  settings = {},
}) {
  const template = getChartJsTemplateById(templateId);
  const resolvedRows = getTemplateRows(rows);
  const validation = validateChartMapping({
    templateId,
    mapping,
    schema,
    rows: resolvedRows,
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const resolvedSettings = mergeSettings(template, settings);
  const categoryField = getMappingValue(mapping, "x");
  const valueField = getMappingValue(mapping, "y") ?? getMappingValue(mapping, "value");
  const seriesField = getMappingValue(mapping, "series");
  const measures = getMappingValues(mapping, "measures");

  if (template.family === "table") {
    return {
      ...buildTableConfig({
        rows: resolvedRows,
        schema,
        columns: getMappingValues(mapping, "columns"),
        settings: resolvedSettings,
      }),
      meta: createMeta(template, resolvedSettings),
    };
  }

  if (template.family === "kpi") {
    return {
      type: "kpi",
      rows: buildKpiRows({
        rows: resolvedRows,
        valueField: getMappingValue(mapping, "value"),
        labelField: getMappingValue(mapping, "label"),
        aggregation: resolvedSettings.aggregation,
      }),
      meta: createMeta(template, resolvedSettings),
    };
  }

  if (template.family === "heatmap") {
    return {
      ...buildHeatmapConfig({
        rows: resolvedRows,
        rowField: getMappingValue(mapping, "row"),
        columnField: getMappingValue(mapping, "column"),
        valueField: getMappingValue(mapping, "value"),
        aggregation: resolvedSettings.aggregation,
      }),
      meta: createMeta(template, resolvedSettings),
    };
  }

  if (template.family === "bar" && template.variant === "floating") {
    return finalizeConfig(
      createCartesianConfig({
        type: "bar",
        ...buildFloatingDatasets({
          rows: resolvedRows,
          categoryField,
          minField: getMappingValue(mapping, "min"),
          maxField: getMappingValue(mapping, "max"),
          seriesField,
          aggregation: resolvedSettings.aggregation,
        }),
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "bar") {
    const categoryConfig = buildCategoryDatasets({
      rows: resolvedRows,
      categoryField,
      valueField,
      seriesField,
      aggregation: resolvedSettings.aggregation,
    });
    const datasets = categoryConfig.datasets.map((dataset) => ({
      ...dataset,
      type: "bar",
      stack: resolvedSettings.stacked ? "stack-0" : undefined,
    }));

    return finalizeConfig(
      createCartesianConfig({
        type: "bar",
        labels: categoryConfig.labels,
        datasets,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "line") {
    const categoryConfig = buildCategoryDatasets({
      rows: resolvedRows,
      categoryField,
      valueField,
      seriesField: template.variant === "multi" ? seriesField : null,
      aggregation: resolvedSettings.aggregation,
      multipleMeasures: template.variant === "multi-axis" ? measures : template.variant === "multi" ? measures : [],
    });
    const datasets = categoryConfig.datasets.map((dataset, index) => ({
      ...dataset,
      type: "line",
      stepped: resolvedSettings.stepped,
      tension: resolvedSettings.smooth ? 0.38 : 0,
      fill: false,
      yAxisID: template.variant === "multi-axis" && index % 2 === 1 ? "y1" : "y",
    }));

    return finalizeConfig(
      createCartesianConfig({
        type: "line",
        labels: categoryConfig.labels,
        datasets,
        settings: { ...resolvedSettings, useSecondaryAxis: template.variant === "multi-axis" },
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "area") {
    const categoryConfig = buildCategoryDatasets({
      rows: resolvedRows,
      categoryField,
      valueField,
      seriesField,
      aggregation: resolvedSettings.aggregation,
    });
    const datasets = categoryConfig.datasets.map((dataset) => ({
      ...dataset,
      type: "line",
      fill: true,
      stack: resolvedSettings.stacked ? "stack-0" : undefined,
      tension: resolvedSettings.smooth ? 0.38 : 0,
    }));

    return finalizeConfig(
      createCartesianConfig({
        type: "line",
        labels: categoryConfig.labels,
        datasets,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "pie") {
    const categoryConfig = buildPieDatasets({
      rows: resolvedRows,
      labelField: getMappingValue(mapping, "label"),
      valueField: getMappingValue(mapping, "value"),
      aggregation: resolvedSettings.aggregation,
    });

    return finalizeConfig(
      createPieLikeConfig({
        type: "pie",
        ...categoryConfig,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "doughnut") {
    const categoryConfig = buildPieDatasets({
      rows: resolvedRows,
      labelField: getMappingValue(mapping, "label"),
      valueField: getMappingValue(mapping, "value"),
      aggregation: resolvedSettings.aggregation,
      measures,
    });

    return finalizeConfig(
      createPieLikeConfig({
        type: "doughnut",
        ...categoryConfig,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "polar-area") {
    const categoryConfig = buildPieDatasets({
      rows: resolvedRows,
      labelField: getMappingValue(mapping, "label"),
      valueField: getMappingValue(mapping, "value"),
      aggregation: resolvedSettings.aggregation,
    });

    return finalizeConfig(
      createRadialConfig({
        type: "polarArea",
        labels: categoryConfig.labels,
        datasets: categoryConfig.datasets,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "radar") {
    const categoryConfig = buildRadarDatasets({
      rows: resolvedRows,
      labelField: getMappingValue(mapping, "label"),
      valueField: getMappingValue(mapping, "value"),
      seriesField,
      measures,
      aggregation: resolvedSettings.aggregation,
      fill: Boolean(resolvedSettings.fill),
    });

    return finalizeConfig(
      createRadialConfig({
        type: "radar",
        labels: categoryConfig.labels,
        datasets: categoryConfig.datasets.map((dataset) => ({ ...dataset, type: "radar" })),
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "scatter") {
    return finalizeConfig(
      createScatterConfig({
        datasets: buildScatterDatasets({
          rows: resolvedRows,
          xField: getMappingValue(mapping, "x"),
          yField: getMappingValue(mapping, "y"),
          seriesField,
        }),
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "bubble") {
    return finalizeConfig(
      createBubbleConfig({
        datasets: buildBubbleDatasets({
          rows: resolvedRows,
          xField: getMappingValue(mapping, "x"),
          yField: getMappingValue(mapping, "y"),
          sizeField: getMappingValue(mapping, "size"),
          seriesField,
        }),
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  if (template.family === "mixed") {
    const mixed = buildMixedDatasets({
      rows: resolvedRows,
      categoryField,
      barField: getMappingValue(mapping, "bar"),
      lineField: getMappingValue(mapping, "line"),
      seriesField,
      aggregation: resolvedSettings.aggregation,
      stacked: resolvedSettings.stacked,
      secondaryAxis: resolvedSettings.useSecondaryAxis,
    });

    return finalizeConfig(
      createMixedConfig({
        labels: mixed.labels,
        datasets: mixed.datasets,
        settings: resolvedSettings,
      }),
      template,
      resolvedRows,
      resolvedSettings
    );
  }

  throw new Error(`Unsupported chart template: ${templateId}`);
}
