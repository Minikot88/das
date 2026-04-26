import { getChartPalette } from "./chartPalette";
import { buildChartJsOptionFactory } from "./chartJsRuntime";
import { withOpacity } from "./chartThemes";
import { resolveChartRuntimeType } from "./chartCatalog";

const SUPPORTED_TYPE_MAP = {
  bar: { supported: true, chartJsType: "bar", mode: "bar" },
  "horizontal-bar": { supported: true, chartJsType: "bar", mode: "horizontal-bar" },
  "grouped-bar": { supported: true, chartJsType: "bar", mode: "grouped-bar" },
  "stacked-bar": { supported: true, chartJsType: "bar", mode: "stacked-bar" },
  line: { supported: true, chartJsType: "line", mode: "line" },
  "multi-line": { supported: true, chartJsType: "line", mode: "multi-line" },
  "smooth-line": { supported: true, chartJsType: "line", mode: "line" },
  "step-line": { supported: true, chartJsType: "line", mode: "step-line" },
  area: { supported: true, chartJsType: "line", mode: "area" },
  "stacked-line": { supported: true, chartJsType: "line", mode: "stacked-line" },
  "stacked-area": { supported: true, chartJsType: "line", mode: "stacked-area" },
  pie: { supported: true, chartJsType: "pie", mode: "pie" },
  donut: { supported: true, chartJsType: "doughnut", mode: "doughnut" },
  rose: { supported: true, chartJsType: "polarArea", mode: "polar-area" },
  radar: { supported: true, chartJsType: "radar", mode: "radar" },
  "polar-area": { supported: true, chartJsType: "polarArea", mode: "polar-area" },
  scatter: { supported: true, chartJsType: "scatter", mode: "scatter" },
  "effect-scatter": { supported: true, chartJsType: "scatter", mode: "scatter" },
  bubble: { supported: true, chartJsType: "bubble", mode: "bubble" },
  gauge: { supported: true, chartJsType: "doughnut", mode: "gauge" },
  "progress-ring": { supported: true, chartJsType: "doughnut", mode: "gauge" },
  kpi: { supported: true, chartJsType: "custom", mode: "kpi" },
  table: { supported: true, chartJsType: "custom", mode: "table" },
  "pivot-table": { supported: true, chartJsType: "custom", mode: "table" },
};

const TYPE_ALIASES = {
  horizontalBar: "horizontal-bar",
  stackedBar: "stacked-bar",
  multiLine: "multi-line",
  doughnut: "donut",
  polarArea: "polar-area",
  "mixed-line-bar": "grouped-bar",
  "half-donut": "donut",
  "nested-pie": "donut",
  "scrollable-pie": "pie",
  "special-label-pie": "pie",
  "rich-text-pie": "pie",
  "rich-text-donut": "donut",
  "simple-gauge": "gauge",
  "speed-gauge": "gauge",
  "stage-gauge": "gauge",
  "barometer-gauge": "gauge",
  "ring-gauge": "progress-ring",
  "large-scatter": "scatter",
  "geo-scatter": "scatter",
  "dataset-bar": "bar",
  "dataset-line": "line",
  "dataset-pie": "pie",
  "datazoom-line": "line",
  "datazoom-bar": "bar",
  "graphic-line": "line",
  "graphic-bar": "bar",
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function detectFieldType(value) {
  if (isFiniteNumber(value)) return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^\d{4}(-\d{2})?(-\d{2})?/.test(value)) return "date";
  return "string";
}

function getSampleValue(rows = [], fieldName) {
  return rows.find((row) => row?.[fieldName] !== undefined && row?.[fieldName] !== null)?.[fieldName];
}

function getFieldName(field) {
  return typeof field === "string" ? field : field?.name;
}

function getMappedFieldNames(roleMapping = {}, roleKeys = []) {
  return unique(
    roleKeys.flatMap((roleKey) =>
      ensureArray(roleMapping?.[roleKey]).map((field) => getFieldName(field)).filter(Boolean)
    )
  );
}

function getFirstMappedField(roleMapping = {}, roleKeys = []) {
  return getMappedFieldNames(roleMapping, roleKeys)[0] ?? null;
}

function getRowKeys(rows = []) {
  return unique(rows.flatMap((row) => Object.keys(row ?? {})));
}

function getStringLikeFields(rows = [], keys = []) {
  return keys.filter((key) => {
    const sample = getSampleValue(rows, key);
    return detectFieldType(sample) !== "number";
  });
}

function getNumericFields(rows = [], keys = []) {
  return keys.filter((key) => {
    const sample = getSampleValue(rows, key);
    return detectFieldType(sample) === "number";
  });
}

function aggregateValues(values = [], aggregate = "sum") {
  if (!values.length) return 0;
  switch (aggregate) {
    case "count":
      return values.length;
    case "avg":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function sumBy(rows = [], valueField, aggregate = "sum") {
  const numericValues = rows
    .map((row) => row?.[valueField])
    .filter((value) => isFiniteNumber(value))
    .map((value) => Number(value));
  return aggregateValues(numericValues, aggregate);
}

function buildFieldCandidates(rows = [], config = {}) {
  const roleMapping = config.roleMapping ?? config.mappings?.roleMapping ?? {};
  const rowKeys = getRowKeys(rows);
  const stringFields = getStringLikeFields(rows, rowKeys);
  const numericFields = getNumericFields(rows, rowKeys);

  const xField = config.xField
    ?? config.x
    ?? config.mappings?.x
    ?? getFirstMappedField(roleMapping, ["x", "category", "time", "date", "column", "region"])
    ?? stringFields[0]
    ?? rowKeys[0]
    ?? null;

  const seriesField = config.seriesField
    ?? config.groupField
    ?? config.groupBy
    ?? config.mappings?.groupBy
    ?? getFirstMappedField(roleMapping, ["series", "row", "group"])
    ?? null;

  const sizeField = config.sizeField
    ?? config.size
    ?? config.sizeBy
    ?? config.mappings?.sizeField
    ?? getFirstMappedField(roleMapping, ["size"])
    ?? null;

  const mappedValueFields = unique([
    config.valueField,
    config.yField,
    config.y,
    config.mappings?.y,
    getFirstMappedField(roleMapping, ["value", "y", "progress"]),
    ...getMappedFieldNames(roleMapping, ["values", "ys"]),
  ].filter(Boolean));

  const numericFallbacks = numericFields.filter((field) => ![xField, seriesField, sizeField].includes(field));
  const valueField = mappedValueFields[0] ?? numericFallbacks[0] ?? null;
  const secondaryValueField = mappedValueFields[1] ?? numericFallbacks.find((field) => field !== valueField) ?? null;
  const multiValueFields = unique([
    ...mappedValueFields,
    ...(mappedValueFields.length > 1 ? [] : secondaryValueField ? [secondaryValueField] : []),
  ]).filter((field) => field && ![seriesField, sizeField].includes(field));

  return {
    rowKeys,
    stringFields,
    numericFields,
    xField,
    yField: valueField,
    valueField,
    valueFields: multiValueFields.length ? multiValueFields : valueField ? [valueField] : [],
    seriesField,
    sizeField,
    labelField: config.labelField ?? xField,
  };
}

export function inferFields(rows = [], config = {}) {
  return buildFieldCandidates(rows, config);
}

export function normalizeChartType(type = "bar", config = {}) {
  const directType = TYPE_ALIASES[type] ?? type;
  const runtimeType =
    config.type
    ?? config.renderType
    ?? config.selectedChartBaseType
    ?? config.meta?.selectedChartBaseType
    ?? resolveChartRuntimeType(directType);

  return TYPE_ALIASES[runtimeType] ?? runtimeType ?? "bar";
}

export function getChartJsSupport(type = "bar") {
  const normalizedType = normalizeChartType(type);
  return SUPPORTED_TYPE_MAP[normalizedType] ?? {
    supported: false,
    chartJsType: null,
    mode: "unsupported",
    placeholder: `Chart type not yet supported in Chart.js renderer`,
  };
}

function buildCategoricalSeriesRows(rows = [], config = {}, type = "bar") {
  const fields = buildFieldCandidates(rows, config);
  const aggregate = config.aggregate ?? config.aggregation ?? config.mappings?.aggregate ?? "sum";
  const labelField = fields.xField;
  const valueFields = fields.valueFields;
  const seriesField = fields.seriesField;
  const palette = getChartPalette(config.colorTheme ?? config.display?.colorTheme ?? "default");

  if (!rows.length || !labelField || !valueFields.length) {
    return {
      status: "invalid",
      data: { labels: [], datasets: [] },
      clickTargets: [],
      reason: "Missing label or value mapping.",
    };
  }

  const labels = unique(rows.map((row) => row?.[labelField]).filter((value) => value !== undefined && value !== null && value !== ""));

  if (!labels.length) {
    return {
      status: "invalid",
      data: { labels: [], datasets: [] },
      clickTargets: [],
      reason: "No label values were found for this chart.",
    };
  }

  const datasets = [];
  const clickTargets = [];

  if (seriesField) {
    const seriesValues = unique(rows.map((row) => row?.[seriesField]).filter((value) => value !== undefined && value !== null && value !== ""));
    seriesValues.forEach((seriesName, seriesIndex) => {
      const data = labels.map((label) => {
        const matchingRows = rows.filter((row) => row?.[labelField] === label && row?.[seriesField] === seriesName);
        return sumBy(matchingRows, valueFields[0], aggregate);
      });
      datasets.push({
        label: String(seriesName),
        data,
        borderColor: palette.colors[seriesIndex % palette.colors.length],
        backgroundColor: withOpacity(palette.colors[seriesIndex % palette.colors.length], type.includes("area") ? 0.22 : 0.8),
        borderWidth: 2,
      });
      clickTargets.push(labels.map((label, index) => ({
        [labelField]: label,
        [seriesField]: seriesName,
        [valueFields[0]]: data[index],
      })));
    });
  } else if (valueFields.length > 1 && !["pie", "donut", "polar-area", "gauge"].includes(type)) {
    valueFields.forEach((valueField, datasetIndex) => {
      const data = labels.map((label) => {
        const matchingRows = rows.filter((row) => row?.[labelField] === label);
        return sumBy(matchingRows, valueField, aggregate);
      });
      datasets.push({
        label: valueField,
        data,
        borderColor: palette.colors[datasetIndex % palette.colors.length],
        backgroundColor: withOpacity(palette.colors[datasetIndex % palette.colors.length], type.includes("area") ? 0.22 : 0.8),
        borderWidth: 2,
      });
      clickTargets.push(labels.map((label, index) => ({
        [labelField]: label,
        [valueField]: data[index],
      })));
    });
  } else {
    const data = labels.map((label) => {
      const matchingRows = rows.filter((row) => row?.[labelField] === label);
      return sumBy(matchingRows, valueFields[0], aggregate);
    });
    datasets.push({
      label: config.title || config.name || valueFields[0],
      data,
      borderColor: palette.single,
      backgroundColor: labels.map((_, index) =>
        withOpacity(palette.colors[index % palette.colors.length], ["pie", "donut", "polar-area"].includes(type) ? 0.9 : 0.8)
      ),
      borderWidth: 2,
    });
    clickTargets.push(labels.map((label, index) => ({
      [labelField]: label,
      [valueFields[0]]: data[index],
    })));
  }

  return {
    status: "success",
    data: { labels, datasets },
    clickTargets,
    fields,
  };
}

function buildScatterRows(rows = [], config = {}, mode = "scatter") {
  const fields = buildFieldCandidates(rows, config);
  const xField = fields.xField;
  const yField = fields.yField;
  const sizeField = fields.sizeField;
  const seriesField = fields.seriesField;
  const palette = getChartPalette(config.colorTheme ?? config.display?.colorTheme ?? "default");

  if (!rows.length || !xField || !yField) {
    return {
      status: "invalid",
      data: { datasets: [] },
      clickTargets: [],
      reason: "Missing numeric X or Y mapping.",
    };
  }

  const filteredRows = rows.filter((row) => isFiniteNumber(row?.[xField]) && isFiniteNumber(row?.[yField]));
  if (!filteredRows.length) {
    return {
      status: "invalid",
      data: { datasets: [] },
      clickTargets: [],
      reason: "No numeric points were found for this chart.",
    };
  }

  const seriesValues = seriesField
    ? unique(filteredRows.map((row) => row?.[seriesField]).filter((value) => value !== undefined && value !== null && value !== ""))
    : ["Series 1"];

  const datasets = seriesValues.map((seriesName, index) => {
    const seriesRows = seriesField
      ? filteredRows.filter((row) => row?.[seriesField] === seriesName)
      : filteredRows;
    return {
      label: String(seriesName),
      data: seriesRows.map((row) => ({
        x: Number(row?.[xField]),
        y: Number(row?.[yField]),
        ...(mode === "bubble" ? { r: Math.max(6, Math.min(22, Number(row?.[sizeField]) || 8)) } : {}),
      })),
      borderColor: palette.colors[index % palette.colors.length],
      backgroundColor: withOpacity(palette.colors[index % palette.colors.length], 0.65),
      pointRadius: mode === "bubble" ? undefined : 5,
      pointHoverRadius: mode === "bubble" ? undefined : 6,
    };
  });

  return {
    status: "success",
    data: { datasets },
    clickTargets: datasets.map((_, index) => {
      const seriesRows = seriesField
        ? filteredRows.filter((row) => row?.[seriesField] === seriesValues[index])
        : filteredRows;
      return seriesRows;
    }),
    fields,
  };
}

function buildGaugeRows(rows = [], config = {}) {
  const fields = buildFieldCandidates(rows, config);
  const valueField = fields.valueField ?? fields.yField;
  const palette = getChartPalette(config.colorTheme ?? config.display?.colorTheme ?? "default");
  const targetField = config.targetValueField
    ?? getFirstMappedField(config.roleMapping ?? config.mappings?.roleMapping ?? {}, ["targetValue"])
    ?? null;

  const metricRow = rows.find((row) => isFiniteNumber(row?.[valueField])) ?? rows[0] ?? null;
  const metricValue = toNumber(metricRow?.[valueField], 0);
  const maxValue = Math.max(toNumber(metricRow?.[targetField], config.settings?.max ?? config.chartSettings?.max ?? 100), metricValue, 1);

  return {
    status: "success",
    data: {
      labels: ["Value", "Remaining"],
      datasets: [
        {
          label: config.title || config.name || valueField || "Gauge",
          data: [metricValue, Math.max(maxValue - metricValue, 0)],
          backgroundColor: [palette.single, withOpacity(palette.single, 0.12)],
          borderColor: [palette.single, withOpacity(palette.single, 0.12)],
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    },
    clickTargets: [[metricRow]],
    fields,
    gaugeMeta: {
      value: metricValue,
      max: maxValue,
      label: config.title || config.name || valueField || "Gauge",
    },
  };
}

function buildTableRows(rows = [], config = {}) {
  const fields = buildFieldCandidates(rows, config);
  const preferredColumns = unique([
    fields.xField,
    ...fields.valueFields,
    fields.seriesField,
    fields.sizeField,
  ]);
  const columns = preferredColumns.length ? preferredColumns : getRowKeys(rows).slice(0, 6);
  return {
    status: "success",
    fields,
    tableMeta: {
      columns,
      rows: rows.slice(0, 10),
    },
  };
}

export function mapLegacyOption(option = {}) {
  const seriesList = ensureArray(option?.series);
  const xAxis = Array.isArray(option?.xAxis) ? option.xAxis[0] : option?.xAxis;
  const labels = ensureArray(xAxis?.data);

  if (!seriesList.length) {
    return {
      status: "invalid",
      data: { labels: [], datasets: [] },
      reason: "Legacy option has no series.",
    };
  }

  const primarySeries = seriesList[0];
  const seriesType = primarySeries?.type ?? "bar";

  if (["pie", "doughnut"].includes(seriesType) || primarySeries?.data?.some((item) => isObject(item) && "value" in item)) {
    const pieData = ensureArray(primarySeries?.data);
    return {
      status: "success",
      inferredType: seriesType === "doughnut" ? "donut" : "pie",
      data: {
        labels: pieData.map((item, index) => item?.name ?? `Slice ${index + 1}`),
        datasets: [
          {
            label: primarySeries?.name ?? "Series 1",
            data: pieData.map((item) => toNumber(item?.value, 0)),
          },
        ],
      },
      clickTargets: [pieData],
    };
  }

  if (["scatter", "effectScatter"].includes(seriesType)) {
    return {
      status: "success",
      inferredType: "scatter",
      data: {
        datasets: seriesList.map((series) => ({
          label: series?.name ?? "Series",
          data: ensureArray(series?.data).map((point) => ({
            x: toNumber(point?.value?.[0] ?? point?.[0] ?? point?.x, 0),
            y: toNumber(point?.value?.[1] ?? point?.[1] ?? point?.y, 0),
          })),
        })),
      },
      clickTargets: seriesList.map((series) => ensureArray(series?.data)),
    };
  }

  return {
    status: "success",
    inferredType: seriesType === "line" ? "line" : "bar",
    data: {
      labels,
      datasets: seriesList.map((series) => ({
        label: series?.name ?? "Series",
        data: ensureArray(series?.data).map((value) => {
          if (isObject(value)) return toNumber(value?.value, 0);
          return toNumber(Array.isArray(value) ? value[value.length - 1] : value, 0);
        }),
      })),
    },
    clickTargets: seriesList.map((series) => ensureArray(series?.data)),
  };
}

export function buildChartJsData({ type = "bar", rows = [], config = {}, theme = "default" } = {}) {
  const themedConfig = config.colorTheme || config.display?.colorTheme
    ? config
    : { ...config, colorTheme: theme };
  const normalizedType = normalizeChartType(type, themedConfig);
  const support = getChartJsSupport(normalizedType);
  if (!support.supported) {
    return {
      status: "unsupported",
      reason: support.placeholder,
      support,
      data: null,
      clickTargets: [],
    };
  }

  if (!rows.length && (themedConfig.option || themedConfig.echartsOption)) {
    const legacy = mapLegacyOption(themedConfig.option ?? themedConfig.echartsOption);
    return {
      ...legacy,
      support: getChartJsSupport(normalizeChartType(legacy.inferredType ?? normalizedType, themedConfig)),
    };
  }

  switch (support.mode) {
    case "scatter":
      return { ...buildScatterRows(rows, themedConfig, "scatter"), support };
    case "bubble":
      return { ...buildScatterRows(rows, themedConfig, "bubble"), support };
    case "gauge":
      return { ...buildGaugeRows(rows, themedConfig), support };
    case "kpi":
    case "table":
      return { ...buildTableRows(rows, themedConfig), support };
    case "polar-area":
    case "pie":
    case "doughnut":
    case "radar":
    case "bar":
    case "horizontal-bar":
    case "grouped-bar":
    case "stacked-bar":
    case "line":
    case "multi-line":
    case "step-line":
    case "area":
    case "stacked-line":
    case "stacked-area":
    default:
      return { ...buildCategoricalSeriesRows(rows, themedConfig, support.mode), support };
  }
}

export function buildChartJsOptions({
  type = "bar",
  config = {},
  theme = "default",
  darkMode = false,
  locale = "th",
  mode = "dashboard",
  chrome = "default",
  data = null,
} = {}) {
  const normalizedType = normalizeChartType(type, config);
  const support = getChartJsSupport(normalizedType);
  return buildChartJsOptionFactory({
    type: normalizedType,
    support,
    data,
    config,
    theme,
    darkMode,
    locale,
    mode,
    chrome,
  }).options;
}
