import { normalizeChartConfig } from "./normalizeChartConfig";
import { getChartMeta, getChartTypeLabel, getChartVariantMeta, resolveChartRuntimeType } from "./chartCatalog";
import { getChartTemplateById, getChartTemplates } from "./chartTemplates";

function asLabel(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(items = []) {
  return Array.from(
    new Set(
      ensureArray(items).filter((item) => item !== null && item !== undefined)
    )
  );
}

function getRoleFieldNames(chart = {}, roleKey) {
  const roleItems = ensureArray(chart.roleMapping?.[roleKey]).map((field) => field?.name).filter(Boolean);
  if (roleItems.length) return roleItems;

  const fallbackMap = {
    category: [chart.x],
    time: [chart.x],
    date: [chart.x],
    x: [chart.x],
    value: [chart.y],
    values: ensureArray(chart.y ? [chart.y] : []),
    y: [chart.y],
    ys: ensureArray(chart.y ? [chart.y] : []),
    series: [chart.groupBy],
    source: [chart.x],
    target: [chart.groupBy],
    size: [chart.sizeField],
    progress: [chart.y],
    targetValue: [chart.max],
  };

  return ensureArray(fallbackMap[roleKey]).filter(Boolean);
}

function resolveRuntimeChartType(type) {
  const resolvedType = resolveChartRuntimeType(type);
  const TYPE_ALIASES = {
    "stacked-line": "multi-line",
    "styled-bar": "bar",
    "background-bar": "bar",
    "negative-bar": "bar",
    "sorted-bar": "bar",
    "mixed-line-bar": "grouped-bar",
    "half-donut": "donut",
    "nested-pie": "donut",
    "special-label-pie": "pie",
    "scrollable-pie": "pie",
    "large-scatter": "scatter",
    "geo-scatter": "scatter",
    "geo-map": "map",
    "geo-graph": "graph",
    "radial-tree": "tree",
    "left-right-tree": "tree",
    "basic-treemap": "treemap",
    "gradient-treemap": "treemap",
    "rounded-sunburst": "sunburst",
    "vertical-sankey": "sankey",
    "gradient-sankey": "sankey",
    "force-graph": "graph",
    "dependency-graph": "graph",
    chord: "graph",
    ohlc: "candlestick",
    "candlestick-large": "candlestick",
    "simple-gauge": "gauge",
    "speed-gauge": "gauge",
    "stage-gauge": "gauge",
    "barometer-gauge": "gauge",
    "ring-gauge": "progress-ring",
    "calendar-heatmap": "calendar",
    "map-lines": "lines",
    "dataset-bar": "bar",
    "dataset-line": "line",
    "dataset-pie": "pie",
    "dataset-matrix": "matrix",
    "dataset-pivot": "pivot-table",
    "datazoom-line": "line",
    "datazoom-bar": "bar",
    "graphic-line": "line",
    "graphic-bar": "bar",
    "rich-text-pie": "pie",
    "rich-text-donut": "donut",
    "rich-text-kpi": "kpi",
    "custom-gantt": "custom",
    "globe-3d": "map",
    "bar-3d": "bar",
    "scatter-3d": "scatter",
    "surface-3d": "heatmap",
    "map-3d": "map",
    "lines-3d": "lines",
    "scatter-gl": "scatter",
    "lines-gl": "lines",
    "flow-gl": "lines",
    "graph-gl": "graph",
  };

  return TYPE_ALIASES[resolvedType] ?? resolvedType;
}

function getEffectiveRuntimeType(selectedType, chart = {}) {
  const runtimeType = resolveRuntimeChartType(selectedType);
  const settings = chart.settings ?? chart.chartSettings ?? {};

  if (runtimeType === "line") {
    if (settings.stack && settings.area) return "stacked-area";
    if (settings.area) return "area";
    if (settings.step) return "step-line";
    if (settings.stack) return "stacked-line";
    if (settings.smooth) return "smooth-line";
  }

  if (["bar", "grouped-bar", "stacked-bar", "horizontal-bar"].includes(runtimeType)) {
    if (settings.horizontal) return "horizontal-bar";
    if (settings.stack) return "stacked-bar";
  }

  if (runtimeType === "pie") {
    if (settings.rose) return "rose";
    if (settings.donut) return "donut";
  }

  if (runtimeType === "scatter" && settings.bubbleMode) {
    return "bubble";
  }

  if (runtimeType === "gauge" && settings.showProgressRing) {
    return "progress-ring";
  }

  return runtimeType;
}

function getPrimaryRoleField(chart = {}, roleKey) {
  return getRoleFieldNames(chart, roleKey)[0] ?? null;
}

function pivotGroupedRows(rows = [], xField, yField, groupField) {
  const categories = [];
  const categorySet = new Set();
  const seriesMap = new Map();

  rows.forEach((row) => {
    const category = asLabel(row[xField]);
    const seriesName = asLabel(row[groupField]);
    const value = Number(row[yField]) || 0;
    if (!categorySet.has(category)) {
      categorySet.add(category);
      categories.push(category);
    }
    if (!seriesMap.has(seriesName)) seriesMap.set(seriesName, new Map());
    seriesMap.get(seriesName).set(category, value);
  });

  return {
    categories,
    series: Array.from(seriesMap.entries()).map(([name, values]) => ({
      name,
      data: categories.map((category) => ({ value: values.get(category) ?? 0, rawDatum: { [xField]: category, [groupField]: name } })),
    })),
  };
}

function buildHierarchyData(rows = [], levelFields = [], valueField) {
  if (!levelFields.length) return [];
  const root = [];

  rows.forEach((row) => {
    let cursor = root;
    levelFields.forEach((fieldName, index) => {
      const label = asLabel(row[fieldName]);
      let node = cursor.find((item) => item.name === label);
      if (!node) {
        node = { name: label, children: [] };
        cursor.push(node);
      }
      if (index === levelFields.length - 1) {
        node.value = (node.value ?? 0) + (Number(row[valueField]) || 0);
        node.rawDatum = row;
      }
      cursor = node.children;
    });
  });

  return root;
}

function buildHeatmapData(rows = [], columnField, rowField, valueField) {
  const columns = Array.from(new Set(rows.map((row) => asLabel(row[columnField]))));
  const rowLabels = Array.from(new Set(rows.map((row) => asLabel(row[rowField]))));
  const values = rows.map((row) => ({
    value: [columns.indexOf(asLabel(row[columnField])), rowLabels.indexOf(asLabel(row[rowField])), Number(row[valueField]) || 0],
    rawDatum: row,
    rowField,
    rowValue: asLabel(row[rowField]),
    columnField,
    columnValue: asLabel(row[columnField]),
  }));

  return { columns, rows: rowLabels, values, max: Math.max(...values.map((item) => item.value[2]), 0) };
}

function buildCalendarData(rows = [], dateField, valueField, seriesField) {
  return rows
    .filter((row) => row?.[dateField] !== undefined && row?.[dateField] !== null && row?.[dateField] !== "")
    .map((row) => ({
      value: [row[dateField], Number(row[valueField]) || 0],
      name: seriesField ? asLabel(row[seriesField]) : undefined,
      rawDatum: row,
    }));
}

function buildSankeyData(rows = [], sourceField, targetField, valueField) {
  const nodeNames = new Set();
  const links = rows.map((row) => {
    const source = asLabel(row[sourceField]);
    const target = asLabel(row[targetField]);
    nodeNames.add(source);
    nodeNames.add(target);
    return { source, target, value: Number(row[valueField]) || 0, rawDatum: row };
  });
  return { nodes: Array.from(nodeNames).map((name) => ({ name })), links };
}

function buildGraphData(rows = [], sourceField, targetField, valueField, categoryField, sizeField) {
  const nodeMap = new Map();
  const links = rows.map((row) => {
    const source = asLabel(row[sourceField]);
    const target = asLabel(row[targetField]);
    [source, target].forEach((name) => {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          name,
          category: categoryField ? asLabel(row[categoryField]) : undefined,
          value: sizeField ? Number(row[sizeField]) || 0 : Number(row[valueField]) || 0,
        });
      }
    });
    return { source, target, value: Number(row[valueField]) || 0, rawDatum: row };
  });

  return { nodes: Array.from(nodeMap.values()), links };
}

function buildMultiMeasureGroupedRows(rows = [], categoryField, valueFields = []) {
  const categories = [];
  const categorySet = new Set();
  const seriesMap = new Map();

  rows.forEach((row) => {
    const category = asLabel(row[categoryField]);
    if (!categorySet.has(category)) {
      categorySet.add(category);
      categories.push(category);
    }

    valueFields.forEach((fieldName) => {
      if (!seriesMap.has(fieldName)) {
        seriesMap.set(fieldName, new Map());
      }
      seriesMap.get(fieldName).set(category, Number(row[fieldName]) || 0);
    });
  });

  return {
    categories,
    series: Array.from(seriesMap.entries()).map(([name, values]) => ({
      name,
      data: categories.map((category) => ({
        value: values.get(category) ?? 0,
        rawDatum: { [categoryField]: category, __measure: name },
      })),
    })),
  };
}

function buildWaterfallData(rows = [], categoryField, valueField) {
  let cumulative = 0;
  const categories = [];
  const base = [];
  const values = [];

  rows.forEach((row) => {
    const value = Number(row[valueField]) || 0;
    categories.push(asLabel(row[categoryField]));
    base.push(cumulative);
    values.push(value);
    cumulative += value;
  });

  return { categories, base, values, total: cumulative };
}

function quantile(sorted = [], ratio) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * ratio;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] != null ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function buildBoxplotData(rows = [], categoryField, boxplotFields = {}) {
  const precomputedFields = [boxplotFields.minField, boxplotFields.q1Field, boxplotFields.medianField, boxplotFields.q3Field, boxplotFields.maxField].filter(Boolean);

  if (precomputedFields.length >= 5) {
    return {
      categories: rows.map((row) => asLabel(row[categoryField])),
      values: rows.map((row) => precomputedFields.slice(0, 5).map((field) => Number(row[field]) || 0)),
    };
  }

  const valueField = boxplotFields.valueField;
  const buckets = new Map();
  rows.forEach((row) => {
    const category = categoryField ? asLabel(row[categoryField]) : "Series";
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push(Number(row[valueField]) || 0);
  });

  const categories = [];
  const values = [];
  Array.from(buckets.entries()).forEach(([category, items]) => {
    const sorted = [...items].filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return;
    categories.push(category);
    values.push([sorted[0], quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75), sorted[sorted.length - 1]]);
  });

  return { categories, values };
}

function buildParallelData(rows = [], dimensionFields = []) {
  return {
    axes: dimensionFields.map((field) => ({ dim: field, name: field })),
    values: rows.map((row) => dimensionFields.map((field) => Number(row[field]) || 0)),
  };
}

function buildCandlestickData(rows = [], timeField, openField, closeField, lowField, highField) {
  return {
    categories: rows.map((row) => asLabel(row[timeField])),
    values: rows.map((row) => [Number(row[openField]) || 0, Number(row[closeField]) || 0, Number(row[lowField]) || 0, Number(row[highField]) || 0]),
  };
}

function buildMapData(rows = [], geoField, valueField) {
  return rows.map((row) => ({ name: asLabel(row[geoField]), value: Number(row[valueField]) || 0, rawDatum: row }));
}

function resolveModelFields(chart) {
  const hierarchyFields = getRoleFieldNames(chart, "hierarchy");
  const dimensionFields = getRoleFieldNames(chart, "dimensions");
  const valuesFields = getRoleFieldNames(chart, "values");
  const ysFields = getRoleFieldNames(chart, "ys");
  return {
    categoryField: getPrimaryRoleField(chart, "category") ?? chart.x,
    valueField: getPrimaryRoleField(chart, "value") ?? chart.y,
    valuesFields,
    seriesField: getPrimaryRoleField(chart, "series") ?? chart.groupBy,
    xField: getPrimaryRoleField(chart, "x") ?? chart.x,
    yField: getPrimaryRoleField(chart, "y") ?? chart.y,
    ysFields,
    timeField: getPrimaryRoleField(chart, "time") ?? chart.x,
    dateField: getPrimaryRoleField(chart, "date") ?? getPrimaryRoleField(chart, "time") ?? chart.x,
    rowField: getPrimaryRoleField(chart, "row"),
    columnField: getPrimaryRoleField(chart, "column"),
    sizeField: getPrimaryRoleField(chart, "size") ?? chart.sizeField,
    sourceField: getPrimaryRoleField(chart, "source") ?? chart.x,
    targetField: getPrimaryRoleField(chart, "target") ?? chart.groupBy,
    hierarchyFields,
    dimensionsFields: dimensionFields,
    regionField: getPrimaryRoleField(chart, "region") ?? getPrimaryRoleField(chart, "geo") ?? chart.x,
    geoField: getPrimaryRoleField(chart, "geo") ?? chart.x,
    geoFromField: getPrimaryRoleField(chart, "geoFrom") ?? chart.x,
    geoToField: getPrimaryRoleField(chart, "geoTo") ?? chart.groupBy,
    openField: getPrimaryRoleField(chart, "open"),
    closeField: getPrimaryRoleField(chart, "close"),
    lowField: getPrimaryRoleField(chart, "low"),
    highField: getPrimaryRoleField(chart, "high"),
    minField: getPrimaryRoleField(chart, "min"),
    q1Field: getPrimaryRoleField(chart, "q1"),
    medianField: getPrimaryRoleField(chart, "median"),
    q3Field: getPrimaryRoleField(chart, "q3"),
    maxField: getPrimaryRoleField(chart, "max"),
    progressField: getPrimaryRoleField(chart, "progress") ?? chart.y,
    targetValueField: getPrimaryRoleField(chart, "targetValue"),
    nodesFields: getRoleFieldNames(chart, "nodes"),
    edgesFields: getRoleFieldNames(chart, "edges"),
    customFields: getRoleFieldNames(chart, "custom"),
  };
}

function createStatus(code, message, level = "info") {
  return { code, message, level };
}

export function createChartRuntimeModel({
  chart: rawChart = {},
  type,
  chartData = [],
  seriesKeys = [],
  xField,
  yField,
  groupField,
  sizeField,
  displayTitle,
  showLegend,
  isSmooth,
  isReadOnly,
  mode = "default",
} = {}) {
  const selectedType = rawChart.chartType ?? type ?? rawChart.type;
  const variantMeta = getChartVariantMeta(selectedType);
  const baseRuntimeType = resolveRuntimeChartType(selectedType);
  const chart = normalizeChartConfig({
    ...rawChart,
    chartType: selectedType,
    selectedChartFamily: rawChart.selectedChartFamily ?? rawChart.familyId ?? variantMeta?.familyId ?? null,
    selectedChartVariant: rawChart.selectedChartVariant ?? rawChart.variantId ?? variantMeta?.id ?? null,
    selectedChartBaseType: rawChart.selectedChartBaseType ?? variantMeta?.chartId ?? baseRuntimeType,
    x: xField ?? rawChart.x,
    y: yField ?? rawChart.y,
    groupBy: groupField ?? rawChart.groupBy,
    sizeField: sizeField ?? rawChart.sizeField,
  });
  const runtimeType = getEffectiveRuntimeType(selectedType, chart);
  const meta = getChartMeta(selectedType);
  const fields = resolveModelFields(chart);
  const rows = ensureArray(chartData);
  const status = [];

  if (!rows.length) status.push(createStatus("no-data", "No rows returned for this chart."));

  let prepared = rows;
  let extras = { seriesKeys: ensureArray(seriesKeys) };
  const multiMeasureFields = unique([
    fields.valueField,
    ...fields.valuesFields,
    ...fields.ysFields,
  ]).filter(Boolean);

  if (["gauge", "progress-ring"].includes(runtimeType) && (fields.targetValueField || chart.settings?.max !== undefined)) {
    prepared = rows.map((row) => ({
      ...row,
      max: Number(row[fields.targetValueField]) || Number(row.max) || Number(chart.settings?.max) || 0,
    }));
  }

  switch (runtimeType) {
    case "grouped-bar":
    case "stacked-bar":
    case "multi-line":
    case "stacked-line":
    case "stacked-area":
      extras = {
        ...extras,
        grouped: fields.seriesField
          ? pivotGroupedRows(prepared, fields.categoryField ?? fields.timeField ?? fields.xField, fields.valueField, fields.seriesField)
          : buildMultiMeasureGroupedRows(prepared, fields.categoryField ?? fields.timeField ?? fields.xField, multiMeasureFields),
      };
      break;
    case "heatmap":
    case "matrix":
      extras = {
        ...extras,
        heatmap: (() => {
          const heatmap = buildHeatmapData(
            rows,
            fields.columnField ?? fields.categoryField ?? fields.xField ?? fields.timeField ?? fields.geoField ?? fields.seriesField,
            fields.rowField ?? fields.seriesField ?? fields.categoryField,
            fields.valueField
          );
          const visualMin = chart.settings?.visualMin;
          const visualMax = chart.settings?.visualMax;
          return {
            ...heatmap,
            min: visualMin === "auto" || visualMin === undefined ? 0 : Number(visualMin) || 0,
            max:
              visualMax === "auto" || visualMax === undefined
                ? heatmap.max
                : Math.max(Number(visualMax) || heatmap.max || 0, 0),
          };
        })(),
      };
      break;
    case "treemap":
    case "sunburst":
    case "tree":
      extras = { ...extras, hierarchy: buildHierarchyData(rows, fields.hierarchyFields.length ? fields.hierarchyFields : [fields.categoryField, fields.seriesField].filter(Boolean), fields.valueField) };
      break;
    case "sankey":
      extras = { ...extras, sankey: buildSankeyData(rows, fields.sourceField, fields.targetField, fields.valueField) };
      break;
    case "graph":
      extras = { ...extras, graph: buildGraphData(prepared, fields.sourceField, fields.targetField, fields.valueField, fields.seriesField, fields.sizeField) };
      break;
    case "waterfall":
      extras = { ...extras, waterfall: buildWaterfallData(rows, fields.categoryField, fields.valueField) };
      break;
    case "boxplot":
      extras = {
        ...extras,
        boxplot: buildBoxplotData(rows, fields.categoryField, {
          valueField: fields.valueField,
          minField: fields.minField,
          q1Field: fields.q1Field,
          medianField: fields.medianField,
          q3Field: fields.q3Field,
          maxField: fields.maxField,
        }),
      };
      break;
    case "parallel":
      extras = { ...extras, parallel: buildParallelData(rows, fields.dimensionsFields) };
      break;
    case "candlestick":
      extras = { ...extras, candlestick: buildCandlestickData(rows, fields.timeField, fields.openField, fields.closeField, fields.lowField, fields.highField) };
      break;
    case "map":
      extras = { ...extras, mapData: buildMapData(prepared, fields.regionField ?? fields.geoField, fields.valueField) };
      break;
    case "calendar":
      extras = { ...extras, calendar: buildCalendarData(prepared, fields.dateField, fields.valueField, fields.seriesField) };
      break;
    default:
      break;
  }

  if (["map", "lines", "custom"].includes(runtimeType) && meta.previewSupported === false) {
    status.push(createStatus("config-needed", `${meta.name} needs additional runtime configuration to render fully.`, "warning"));
  }

  if (runtimeType === "candlestick" && (!fields.openField || !fields.closeField || !fields.lowField || !fields.highField)) {
    status.push(createStatus("ohlc-missing", "Candlestick needs open, close, low, and high fields.", "warning"));
  }

  if (runtimeType === "parallel" && fields.dimensionsFields.length < 2) {
    status.push(createStatus("dimensions-missing", "Parallel needs at least two numeric dimensions.", "warning"));
  }

  return {
    chart,
    meta,
    type: runtimeType,
    selectedType,
    variantId: chart.selectedChartVariant ?? variantMeta?.id ?? null,
    familyId: chart.selectedChartFamily ?? variantMeta?.familyId ?? meta.selectorFamilyId ?? meta.family,
    family: meta.family,
    preset: meta.preset,
    rows: prepared,
    fields,
    extras,
    displayTitle: displayTitle ?? chart.labels?.title ?? chart.title ?? chart.labels?.name ?? chart.name ?? getChartTypeLabel(chart.chartType),
    showLegend: showLegend ?? chart.legendVisible !== false,
    isSmooth: isSmooth ?? chart.smooth === true,
    isReadOnly,
    mode,
    status,
  };
}

export function createDefaultWidgetName(chartType, existingCharts = []) {
  const label = getChartTypeLabel(chartType).replace(/\s+Chart$/i, " Chart");
  const matchingCount = existingCharts.filter((chart) => normalizeChartConfig(chart.config).chartType === chartType).length;
  return `${label} ${matchingCount + 1}`;
}

export function createChartFromTemplate(templateId, overrides = {}) {
  const template = getChartTemplateById(templateId);
  return {
    ...template,
    ...overrides,
    type: overrides.type ?? template.type,
    defaultSize: overrides.defaultSize ?? template.defaultSize,
    palette: overrides.palette ?? template.palette,
  };
}

export { getChartTemplates, getChartTemplateById, getChartTypeLabel };
