import { getColorPalette } from "./chartUtils";
import { createChartRuntimeModel } from "./chartFactory";
import {
  createAreaFill,
  createBarFill,
  darkenColor,
  formatChartValue,
  getAxisStyles,
  getChartTheme,
  getGridStyle,
  getTooltipStyle,
  withOpacity,
} from "./chartThemes";

function asLabel(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? formatChartValue(value) : value;
}

function buildBaseOption({ chart, chartType, showLegend, categories = [], xName = "", yName = "", mode = "default" }) {
  const theme = getChartTheme();
  const axis = getAxisStyles({ chartType, categories, xName, yName, valueFormatter: formatNumber, showSplitLine: chart.showGrid !== false });
  const isBuilderPreview = mode === "builder-preview";
  return {
    backgroundColor: "transparent",
    animationDuration: 350,
    animationEasing: "cubicOut",
    textStyle: {
      color: theme.text,
      fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
    },
    grid: getGridStyle({ top: isBuilderPreview ? 24 : 28, right: 16, bottom: showLegend ? 52 : 24, left: 24 }),
    legend: showLegend
      ? {
          bottom: 8,
          left: "center",
          icon: "rect",
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 12,
          textStyle: { color: theme.axisLabel, fontSize: isBuilderPreview ? 10 : 11 },
        }
      : undefined,
    tooltip: getTooltipStyle({ chartType, valueFormatter: formatChartValue }),
    xAxis: axis.xAxis,
    yAxis: axis.yAxis,
  };
}

function buildPlaceholderOption(title, message, warning = false) {
  return {
    animation: false,
    graphic: [
      {
        type: "group",
        left: "center",
        top: "middle",
        children: [
          { type: "text", style: { text: title, fill: warning ? "#b45309" : "#475569", font: "600 15px IBM Plex Sans, Segoe UI, sans-serif", textAlign: "center" }, top: -18 },
          { type: "text", style: { text: message, fill: "#64748b", font: "12px IBM Plex Sans, Segoe UI, sans-serif", textAlign: "center" }, top: 8 },
        ],
      },
    ],
  };
}

function buildSingleSeriesData(rows = [], categoryField, valueField) {
  return {
    categories: rows.map((row) => asLabel(row[categoryField])),
    values: rows.map((row) => ({ value: Number(row[valueField]) || 0, rawDatum: row })),
  };
}

function buildRadarSeries(rows = [], categoryField, valueField, seriesField, palette) {
  const categories = Array.from(new Set(rows.map((row) => asLabel(row[categoryField]))));
  const grouped = seriesField ? Array.from(new Set(rows.map((row) => asLabel(row[seriesField])))) : ["Series"];
  const indicators = categories.map((category) => ({
    name: category,
    max: Math.max(1, ...rows.filter((row) => asLabel(row[categoryField]) === category).map((row) => Number(row[valueField]) || 0)),
  }));

  return {
    indicators,
    series: grouped.map((group, index) => ({
      name: group,
      value: categories.map((category) => {
        const found = rows.find((row) => asLabel(row[categoryField]) === category && asLabel(row[seriesField]) === group);
        return Number(found?.[valueField]) || 0;
      }),
      lineStyle: { color: palette.colors[index % palette.colors.length], width: 2 },
      itemStyle: { color: palette.colors[index % palette.colors.length] },
      areaStyle: { color: withOpacity(palette.colors[index % palette.colors.length], 0.16) },
    })),
  };
}

function buildThemeRiverData(rows = [], timeField, categoryField, valueField) {
  return rows.map((row) => [row[timeField], Number(row[valueField]) || 0, asLabel(row[categoryField])]);
}

function buildCalendarRange(values = []) {
  const dates = values
    .map((item) => item?.value?.[0])
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left - right);

  if (!dates.length) return new Date().getFullYear();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return [`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`, `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`];
}

function buildLinesPreview(rows = [], fromField, toField, valueField) {
  return rows.map((row, index) => ({
    name: `${asLabel(row[fromField])} -> ${asLabel(row[toField])}`,
    value: Number(row[valueField]) || index + 1,
    rawDatum: row,
  }));
}

function buildBarSeries(values, color, extra = {}) {
  return {
    type: "bar",
    data: values,
    barMaxWidth: 34,
    itemStyle: { color: createBarFill(color), borderRadius: [6, 6, 0, 0] },
    emphasis: { itemStyle: { color: darkenColor(color, 0.06), borderRadius: [6, 6, 0, 0] } },
    ...extra,
  };
}

function buildLineSeries(values, color, extra = {}) {
  return {
    type: "line",
    data: values,
    smooth: extra.smooth ?? false,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { color, width: 3 },
    itemStyle: { color, borderColor: getChartTheme().surface, borderWidth: 2 },
    ...extra,
  };
}

function buildOptionFromModel(model) {
  const { chart, type, rows, fields, extras, displayTitle, showLegend, isSmooth, mode, status } = model;
  const palette = getColorPalette(chart.colorTheme);
  const base = buildBaseOption({ chart, chartType: type, showLegend, xName: chart.xLabel, yName: chart.yLabel, mode });
  const primaryStatus = status.find((item) => item.level === "warning") ?? status[0];

  if (!rows.length && primaryStatus) {
    return buildPlaceholderOption(displayTitle, primaryStatus.message, primaryStatus.level === "warning");
  }

  switch (type) {
    case "bar":
    case "horizontal-bar":
    case "line":
    case "smooth-line":
    case "step-line":
    case "area": {
      const categoryField = fields.categoryField ?? fields.timeField ?? fields.xField;
      const valueField = fields.valueField ?? fields.yField;
      const single = buildSingleSeriesData(rows, categoryField, valueField);
      const isHorizontal = type === "horizontal-bar";
      const isArea = type === "area";
      const isLine = ["line", "smooth-line", "step-line", "area"].includes(type);
      return {
        ...base,
        xAxis: isHorizontal ? { ...base.xAxis, type: "value", axisLabel: { ...base.xAxis.axisLabel, formatter: formatNumber } } : { ...base.xAxis, type: "category", data: single.categories, boundaryGap: !isLine },
        yAxis: isHorizontal ? { ...base.yAxis, type: "category", data: single.categories } : { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [
          isLine
            ? buildLineSeries(single.values, palette.single, {
                smooth: type === "smooth-line" ? true : isSmooth,
                step: type === "step-line" ? "middle" : false,
                areaStyle: isArea ? { color: createAreaFill(palette.single, 0.16, 0.03) } : undefined,
              })
            : buildBarSeries(single.values, palette.single, { itemStyle: { color: createBarFill(palette.single), borderRadius: isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0] } }),
        ],
      };
    }

    case "grouped-bar":
    case "stacked-bar":
    case "multi-line":
    case "stacked-area": {
      const grouped = extras.grouped ?? { categories: [], series: [] };
      const isLine = ["multi-line", "stacked-area"].includes(type);
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: grouped.categories, boundaryGap: !isLine },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: grouped.series.map((seriesItem, index) => (
          isLine
            ? buildLineSeries(seriesItem.data, palette.colors[index % palette.colors.length], {
                name: seriesItem.name,
                smooth: isSmooth,
                stack: type === "stacked-area" ? "total" : undefined,
                areaStyle: type === "stacked-area" ? { color: createAreaFill(palette.colors[index % palette.colors.length], 0.14, 0.02) } : undefined,
              })
            : buildBarSeries(seriesItem.data, palette.colors[index % palette.colors.length], { name: seriesItem.name, stack: type === "stacked-bar" ? "total" : undefined })
        )),
      };
    }

    case "pie":
    case "donut":
    case "rose": {
      const categoryField = fields.categoryField ?? fields.timeField ?? fields.xField;
      const valueField = fields.valueField ?? fields.yField;
      return {
        backgroundColor: "transparent",
        color: palette.colors,
        tooltip: getTooltipStyle({ chartType: type, trigger: "item", formatter: (params) => `${params.name}<br/>${formatChartValue(params.value)}` }),
        legend: showLegend ? { bottom: 0, left: "center", textStyle: { color: getChartTheme().axisLabel, fontSize: 11 } } : undefined,
        series: [{
          type: "pie",
          radius: type === "donut" ? ["48%", "72%"] : ["0%", "72%"],
          roseType: type === "rose" ? "radius" : undefined,
          data: rows.map((row) => ({ name: asLabel(row[categoryField]), value: Number(row[valueField]) || 0, rawDatum: row })),
          label: { show: chart.showLabels !== false, color: getChartTheme().axisLabel, fontSize: 11 },
          itemStyle: { borderColor: "#ffffff", borderWidth: 1 },
        }],
      };
    }

    case "scatter":
    case "effect-scatter":
    case "bubble": {
      const seriesType = type === "effect-scatter" ? "effectScatter" : "scatter";
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "value", axisLabel: { ...base.xAxis.axisLabel, formatter: formatNumber } },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [{
          type: seriesType,
          symbolSize: (value) => {
            if (type === "bubble" || type === "effect-scatter") {
              const raw = Array.isArray(value) ? value[2] : value;
              return Math.max(12, Math.min(42, Math.sqrt(Math.abs(raw || 0)) * 4));
            }
            return 14;
          },
          rippleEffect: type === "effect-scatter" ? { scale: 2.2, brushType: "stroke" } : undefined,
          itemStyle: { color: palette.single, opacity: type === "bubble" ? 0.72 : 0.9, borderColor: getChartTheme().surface, borderWidth: 1 },
          data: rows.map((row) => ({
            value: [Number(row[fields.xField]) || 0, Number(row[fields.yField]) || 0, Number(row[fields.sizeField ?? fields.yField]) || 0],
            rawDatum: row,
          })),
        }],
      };
    }

    case "radar": {
      const radar = buildRadarSeries(rows, fields.categoryField, fields.valueField, fields.seriesField, palette);
      return {
        ...base,
        legend: showLegend ? { ...(base.legend ?? {}), bottom: 0 } : undefined,
        radar: {
          radius: "62%",
          splitNumber: 4,
          indicator: radar.indicators,
          axisName: { color: getChartTheme().axisLabel, fontSize: 11 },
          splitArea: { areaStyle: { color: [withOpacity(getChartTheme().surface, 0.18), withOpacity(getChartTheme().border, 0.08)] } },
        },
        series: [{ type: "radar", data: radar.series }],
      };
    }

    case "heatmap":
    case "matrix": {
      const heatmap = extras.heatmap;
      return {
        ...base,
        grid: { top: 28, right: 20, bottom: showLegend ? 78 : 30, left: type === "matrix" ? 84 : 90, containLabel: true },
        xAxis: { ...base.xAxis, type: "category", data: heatmap.columns, splitArea: { show: false } },
        yAxis: { ...base.yAxis, type: "category", data: heatmap.rows, splitArea: { show: false } },
        visualMap: {
          min: 0,
          max: heatmap.max || 1,
          orient: "horizontal",
          left: 10,
          bottom: 10,
          textStyle: { color: getChartTheme().axisLabel, fontSize: 11 },
          inRange: { color: [withOpacity(getChartTheme().surface, 0.9), withOpacity(palette.single, 0.28), palette.single] },
        },
        series: [{
          type: "heatmap",
          data: heatmap.values,
          itemStyle: type === "matrix" ? { borderColor: withOpacity(getChartTheme().surface, 0.92), borderWidth: 1 } : undefined,
          label: { show: true, color: getChartTheme().text, fontSize: 11, formatter: ({ value }) => formatNumber(value?.[2]) },
        }],
      };
    }

    case "histogram": {
      const single = { categories: rows.map((row) => asLabel(row.range ?? row.bucket ?? row[fields.categoryField])), values: rows.map((row) => ({ value: Number(row.count ?? row[fields.valueField]) || 0, rawDatum: row })) };
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: single.categories, boundaryGap: true },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [buildBarSeries(single.values, palette.single)],
      };
    }

    case "gauge": {
      const datum = rows[0] ?? {};
      const actual = Number(datum[fields.valueField] ?? datum.actual ?? datum.value) || 0;
      const maximum = Math.max(Number(datum.max) || Math.max(actual, 100), 1);
      return {
        ...base,
        series: [{
          type: "gauge",
          min: 0,
          max: maximum,
          startAngle: 210,
          endAngle: -30,
          progress: { show: true, width: 14, itemStyle: { color: palette.single } },
          axisLine: { lineStyle: { width: 14, color: [[1, withOpacity(getChartTheme().border, 0.45)]] } },
          splitLine: { show: false },
          axisTick: { show: false },
          pointer: { show: true, length: "58%", width: 4 },
          detail: { valueAnimation: false, offsetCenter: [0, "34%"], formatter: () => `${formatNumber(actual)}`, color: getChartTheme().textStrong, fontSize: 24, fontWeight: 700 },
          title: { offsetCenter: [0, "70%"], color: getChartTheme().axisLabel, fontSize: 11 },
          data: [{ value: actual, name: displayTitle }],
        }],
      };
    }

    case "progress-ring": {
      const datum = rows[0] ?? {};
      const actual = Number(datum[fields.progressField] ?? datum.actual ?? datum.value) || 0;
      const maximum = Math.max(Number(datum.max) || Math.max(actual, 100), 1);
      const remaining = Math.max(maximum - actual, 0);
      return {
        ...base,
        graphic: [{ type: "text", left: "center", top: "38%", style: { text: `${Math.round((actual / maximum) * 100)}%`, fill: getChartTheme().textStrong, font: "700 26px IBM Plex Sans, Segoe UI, sans-serif", textAlign: "center" }, silent: true }],
        series: [{ type: "pie", radius: ["58%", "76%"], center: ["50%", "46%"], silent: true, label: { show: false }, data: [{ value: actual, name: "Progress", itemStyle: { color: palette.single } }, { value: remaining, name: "Remaining", itemStyle: { color: withOpacity(getChartTheme().border, 0.48) } }] }],
      };
    }

    case "funnel":
      return {
        ...base,
        series: [{
          type: "funnel",
          left: "10%",
          top: 16,
          bottom: showLegend ? 72 : 20,
          width: "80%",
          minSize: "18%",
          maxSize: "100%",
          sort: "descending",
          gap: 2,
          label: { color: getChartTheme().text, fontSize: 11 },
          data: rows.map((row, index) => ({ name: asLabel(row[fields.categoryField]), value: Number(row[fields.valueField]) || 0, itemStyle: { color: palette.colors[index % palette.colors.length] }, rawDatum: row })),
        }],
      };

    case "sankey": {
      const sankey = extras.sankey;
      return {
        ...base,
        legend: undefined,
        series: [{ type: "sankey", left: 10, right: 10, top: 10, bottom: 10, emphasis: { focus: "adjacency" }, nodeWidth: 18, nodeGap: 12, draggable: false, lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.45 }, label: { color: getChartTheme().text, fontSize: 11 }, data: sankey.nodes, links: sankey.links }],
      };
    }

    case "theme-river":
      return {
        ...base,
        singleAxis: { top: showLegend ? 34 : 12, bottom: 12, left: 12, right: 12, type: "time", axisLabel: { color: getChartTheme().axisLabel, fontSize: 10 } },
        series: [{ type: "themeRiver", data: buildThemeRiverData(rows, fields.timeField, fields.seriesField, fields.valueField) }],
      };

    case "calendar": {
      const calendarData = extras.calendar ?? [];
      if (!calendarData.length) return buildPlaceholderOption(displayTitle, "Calendar needs a date field and a numeric value.", true);
      return {
        backgroundColor: "transparent",
        tooltip: getTooltipStyle({ chartType: type, trigger: "item", formatter: (params) => `${params.value?.[0]}<br/>${formatChartValue(params.value?.[1])}` }),
        visualMap: {
          min: 0,
          max: Math.max(...calendarData.map((item) => item.value?.[1] ?? 0), 1),
          orient: "horizontal",
          left: "center",
          bottom: 8,
          textStyle: { color: getChartTheme().axisLabel, fontSize: 11 },
          inRange: { color: [withOpacity(getChartTheme().surface, 0.95), withOpacity(palette.single, 0.25), palette.single] },
        },
        calendar: {
          top: 24,
          left: 20,
          right: 20,
          bottom: 54,
          range: buildCalendarRange(calendarData),
          cellSize: ["auto", 18],
          splitLine: { show: false },
          itemStyle: { borderWidth: 1, borderColor: withOpacity(getChartTheme().border, 0.4) },
          yearLabel: { color: getChartTheme().axisLabel },
          monthLabel: { color: getChartTheme().axisLabel },
          dayLabel: { color: getChartTheme().axisLabel, firstDay: 1 },
        },
        series: [{
          type: "heatmap",
          coordinateSystem: "calendar",
          data: calendarData.map((item) => item.value),
        }],
      };
    }

    case "tree":
      return {
        ...base,
        legend: undefined,
        series: [{ type: "tree", data: [{ name: displayTitle, children: extras.hierarchy }], top: 10, left: 10, bottom: 10, right: 18, symbol: "circle", symbolSize: 10, orient: "LR", expandAndCollapse: false, roam: false, label: { position: "left", verticalAlign: "middle", align: "right", fontSize: 11, color: getChartTheme().text }, leaves: { label: { position: "right", align: "left" } } }],
      };

    case "treemap":
      return { ...base, series: [{ type: "treemap", roam: false, breadcrumb: { show: false }, levels: [{ color: palette.colors }], data: extras.hierarchy }] };

    case "sunburst":
      return { ...base, series: [{ type: "sunburst", radius: ["18%", "84%"], sort: undefined, data: extras.hierarchy }] };

    case "waterfall": {
      const waterfall = extras.waterfall;
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: waterfall.categories },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [
          { type: "bar", stack: "total", silent: true, itemStyle: { color: "transparent", borderColor: "transparent" }, data: waterfall.base },
          { type: "bar", stack: "total", itemStyle: { color: createBarFill(palette.single), borderRadius: [6, 6, 0, 0] }, data: waterfall.values },
        ],
      };
    }

    case "boxplot": {
      const boxplot = extras.boxplot;
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: boxplot.categories },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [{ type: "boxplot", data: boxplot.values }],
      };
    }

    case "parallel": {
      const parallel = extras.parallel;
      if (!parallel.axes?.length) return buildPlaceholderOption(displayTitle, "Parallel needs at least two numeric dimensions.", true);
      return {
        backgroundColor: "transparent",
        parallelAxis: parallel.axes.map((axis, index) => ({ dim: index, name: axis.name })),
        parallel: { left: 24, right: 24, top: 28, bottom: 24 },
        series: [{ type: "parallel", lineStyle: { width: 1.5, color: palette.single }, data: parallel.values }],
      };
    }

    case "candlestick": {
      const candlestick = extras.candlestick;
      if (!candlestick?.categories?.length) return buildPlaceholderOption(displayTitle, "Candlestick needs time, open, close, low, and high fields.", true);
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: candlestick.categories },
        yAxis: { ...base.yAxis, type: "value", scale: true, axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [{ type: "candlestick", data: candlestick.values }],
      };
    }

    case "graph": {
      const graph = extras.graph;
      return {
        backgroundColor: "transparent",
        legend: showLegend ? [{ data: unique(graph.nodes.map((node) => node.category)).filter(Boolean) }] : undefined,
        series: [{ type: "graph", layout: "circular", roam: false, label: { show: true }, data: graph.nodes, links: graph.links, lineStyle: { color: "source", curveness: 0.2 } }],
      };
    }

    case "map":
      return buildPlaceholderOption(displayTitle, "Map preview needs a registered map in the runtime. Region/value mappings are preserved and ready.", true);

    case "lines":
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: rows.map((row) => `${asLabel(row[fields.geoFromField])} -> ${asLabel(row[fields.geoToField])}`) },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [buildLineSeries(buildLinesPreview(rows, fields.geoFromField, fields.geoToField, fields.valueField), palette.single)],
      };

    case "bar-racing": {
      const single = buildSingleSeriesData(rows, fields.categoryField, fields.valueField);
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "value", axisLabel: { ...base.xAxis.axisLabel, formatter: formatNumber } },
        yAxis: { ...base.yAxis, type: "category", data: single.categories },
        series: [buildBarSeries(single.values, palette.single, { itemStyle: { color: createBarFill(palette.single), borderRadius: [0, 6, 6, 0] } })],
      };
    }

    case "pictorial-bar": {
      const single = buildSingleSeriesData(rows, fields.categoryField, fields.valueField);
      return {
        ...base,
        xAxis: { ...base.xAxis, type: "category", data: single.categories, boundaryGap: true },
        yAxis: { ...base.yAxis, type: "value", axisLabel: { ...base.yAxis.axisLabel, formatter: formatNumber } },
        series: [{ type: "pictorialBar", symbol: "roundRect", symbolClip: true, symbolBoundingData: Math.max(...single.values.map((item) => item.value), 1), symbolSize: ["58%", "100%"], itemStyle: { color: createBarFill(palette.single) }, data: single.values }],
      };
    }

    case "custom":
      return buildPlaceholderOption(displayTitle, "Custom series are cataloged and mappable, but need custom render logic before preview can draw them.", true);

    case "table":
    case "pivot-table":
    case "kpi":
      return buildPlaceholderOption(displayTitle, `${displayTitle} is rendered by a dedicated component in the Builder preview.`);

    default:
      return buildPlaceholderOption(displayTitle, `Unsupported chart type: ${type}`, true);
  }
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function buildEChartOption(input = {}) {
  const model = createChartRuntimeModel(input);
  return buildOptionFromModel(model);
}

export function buildChartOptionByType(type, payload = {}, overrides = {}) {
  return buildEChartOption({ chart: { ...(payload.config ?? {}), chartType: type }, type, chartData: payload.rows ?? [], ...overrides });
}

export function buildChartClickPayload({ type, params, xField, groupField }) {
  if (!params) return null;

  if (["heatmap", "matrix"].includes(type)) {
    return {
      rowField: params.data?.rowField,
      rowValue: params.data?.rowValue,
      columnField: params.data?.columnField,
      columnValue: params.data?.columnValue,
    };
  }

  if (["grouped-bar", "stacked-bar", "multi-line", "stacked-area"].includes(type)) {
    return { payload: { [xField]: params.name, [groupField]: params.seriesName } };
  }

  if (params.data?.rawDatum) {
    return { payload: params.data.rawDatum };
  }

  return null;
}
