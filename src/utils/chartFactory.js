import { getChartJsTemplateById } from "./chartTemplates.js";
import { validateChartMapping } from "./chartCompatibility.js";
import { createCartesianOptions, createPieOptions, createRadialOptions } from "./chartTheme.js";
import { chartJsPalette, getNamedChartPalette, pickChartColor } from "./chartPalette.js";

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
  return {
    templateId: template.id,
    family: template.family,
    variant: template.variant,
    settings: {
      palette: settings.palette ?? "chartjs",
      backgroundColor: settings.backgroundColor ?? "#ffffff",
      borderColor: settings.borderColor ?? "",
      cardBackground: settings.cardBackground ?? "",
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
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
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
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
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
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
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
      backgroundColor: settings.backgroundColor,
      titleColor: settings.titleColor,
      axisLabelColor: settings.axisLabelColor,
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
    cardBackground: "",
    lineWidth: 2,
    barBorderRadius: 8,
    ...template.defaultSettings,
    ...settings,
  };
}

function finalizeConfig(config, template, rows, settings) {
  return {
    ...attachAppearance(config, template, settings),
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
