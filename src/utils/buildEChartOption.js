import { getColorPalette } from "./chartUtils";
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

function buildSeriesDataset(chartData, xField, yField, groupField) {
  const categories = [...new Set(chartData.map((row) => asLabel(row[xField])))];
  const seriesNames = [...new Set(chartData.map((row) => asLabel(row[groupField])))];
  const valueBySeries = new Map();

  for (const row of chartData) {
    const seriesName = asLabel(row[groupField]);
    const category = asLabel(row[xField]);
    if (!valueBySeries.has(seriesName)) {
      valueBySeries.set(seriesName, new Map());
    }
    valueBySeries.get(seriesName).set(category, Number(row[yField]) || 0);
  }

  return {
    categories,
    seriesNames,
    seriesData: seriesNames.map((seriesName) => ({
      name: seriesName,
      data: categories.map((category) => ({
        value: valueBySeries.get(seriesName)?.get(category) ?? 0,
        rawDatum: {
          [xField]: category,
          [groupField]: seriesName,
        },
      })),
    })),
  };
}

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? formatChartValue(value) : value;
}

function buildTokens() {
  const theme = getChartTheme();
  return {
    surface: theme.surface,
    body: "#f4f7fb",
    textBase: theme.text,
    textMuted: theme.axisLabel,
    textStrong: theme.textStrong,
    border: theme.border,
    borderStrong: theme.border,
    grid: theme.splitLine,
    axis: theme.axis,
    pointer: theme.pointer,
    shadowPointer: theme.shadowPointer,
    primary: theme.palettes.technical[0],
  };
}

function buildBaseOption({ showLegend, isReadOnly, tokens, chart }) {
  const tooltip = getTooltipStyle({
    chartType: "line",
    valueFormatter: formatChartValue,
  });
  const hasTitle = Boolean(chart?.title || chart?.subtitle);

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    animationEasing: "cubicOut",
    textStyle: {
      color: tokens.textBase,
      fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
    },
    grid: getGridStyle({
      top: hasTitle ? 54 : isReadOnly ? 34 : 32,
      right: isReadOnly ? 22 : 20,
      bottom: showLegend ? 64 : 28,
      left: isReadOnly ? 24 : 20,
    }),
    legend: showLegend
      ? {
          bottom: 4,
          left: 8,
          icon: "rect",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: {
            color: tokens.textMuted,
            fontSize: isReadOnly ? 12 : 11,
          },
        }
      : undefined,
    tooltip: tooltip,
    title: undefined,
  };
}

function buildTitleOption(chart, tokens) {
  if (!chart?.title && !chart?.subtitle) return undefined;

  return {
    text: chart.title || "",
    subtext: chart.subtitle || "",
    left: 0,
    top: 0,
    textStyle: {
      color: tokens.textStrong,
      fontSize: 13,
      fontWeight: 600,
    },
    subtextStyle: {
      color: tokens.textMuted,
      fontSize: 11,
    },
  };
}

function buildSeriesLabel(showLabels, tokens, formatter) {
  if (!showLabels) return { show: false };
  return {
    show: true,
    color: tokens.textMuted,
    fontSize: 10,
    formatter,
  };
}

function buildAxis(tokens, chart, axis = "x") {
  const chartType = chart?.chartType ?? chart?.type ?? "bar";
  const axisStyles = getAxisStyles({
    chartType,
    valueFormatter: formatNumber,
    xName: chart.xLabel,
    yName: chart.yLabel,
    showSplitLine: chart.showGrid !== false,
  });

  return axis === "x" ? axisStyles.xAxis : axisStyles.yAxis;
}

function buildHeatmapSeries(chartData, xField, yField, groupField) {
  const rowField = groupField || xField;
  const columnField = groupField ? xField : yField;
  const rows = [...new Set(chartData.map((item) => asLabel(item[rowField])))];
  const columns = [...new Set(chartData.map((item) => asLabel(item[columnField])))];

  const values = chartData.map((item) => {
    const rowValue = asLabel(item[rowField]);
    const columnValue = asLabel(item[columnField]);
    return {
      value: [
        columns.indexOf(columnValue),
        rows.indexOf(rowValue),
        Number(item[yField]) || 0,
      ],
      rawDatum: item,
      rowField,
      rowValue,
      columnField,
      columnValue,
    };
  });

  const max = Math.max(...values.map((item) => item.value[2]), 0);
  return { rows, columns, values, max };
}

function buildRadarSeries({ chartData, seriesKeys, xField, yField, groupField, palette, displayTitle }) {
  const indicators = chartData.map((row) => ({
    name: asLabel(row[xField]),
    max: Math.max(
      1,
      ...seriesKeys.map((key) => Number(row[key] ?? row[yField] ?? 0) || 0)
    ),
  }));

  const series = seriesKeys.map((key, index) => ({
    name: groupField ? key : displayTitle,
    value: chartData.map((row) => Number(row[key] ?? row[yField] ?? 0) || 0),
    rawSeriesKey: key,
  }));

  return {
    indicators,
    series: series.map((item, index) => ({
      value: item.value,
      name: item.name,
      rawSeriesKey: item.rawSeriesKey,
      lineStyle: {
        color: palette.colors[index % palette.colors.length],
        width: 2,
      },
      itemStyle: {
        color: palette.colors[index % palette.colors.length],
      },
      areaStyle: {
        color: withOpacity(palette.colors[index % palette.colors.length], 0.18),
      },
    })),
  };
}

function buildHierarchySeries(chartData = [], xField, yField, groupField) {
  if (!chartData.length || !xField || !yField) return [];

  if (!groupField) {
    return chartData.map((row) => ({
      name: asLabel(row[xField]),
      value: Number(row[yField]) || 0,
      rawDatum: row,
    }));
  }

  const parents = new Map();
  chartData.forEach((row) => {
    const parent = asLabel(row[groupField]);
    const child = asLabel(row[xField]);
    if (!parents.has(parent)) {
      parents.set(parent, { name: parent, children: [] });
    }
    parents.get(parent).children.push({
      name: child,
      value: Number(row[yField]) || 0,
      rawDatum: row,
    });
  });

  return Array.from(parents.values());
}

function buildWaterfallSeries(chartData = [], xField, yField) {
  let cumulative = 0;
  const categories = [];
  const base = [];
  const values = [];

  chartData.forEach((row) => {
    const value = Number(row[yField]) || 0;
    categories.push(asLabel(row[xField]));
    base.push(cumulative);
    values.push(value);
    cumulative += value;
  });

  return { categories, base, values, total: cumulative };
}

export function buildEChartOption({
  chart,
  type,
  chartData,
  seriesKeys,
  xField,
  yField,
  groupField,
  sizeField,
  displayTitle,
  showLegend,
  isSmooth,
  isReadOnly,
}) {
  const tokens = buildTokens();
  const palette = getColorPalette(chart?.colorTheme);
  const baseOption = buildBaseOption({ showLegend, isReadOnly, tokens, chart });
  const xAxis = buildAxis(tokens, chart, "x");
  const yAxis = buildAxis(tokens, chart, "y");
  const title = buildTitleOption(chart, tokens);

  switch (type) {
    case "line":
    case "multi-line":
    case "area":
    case "stacked-area":
    case "step-line":
      if (groupField) {
        const groupedSeries = buildSeriesDataset(chartData, xField, yField, groupField);

        return {
          ...baseOption,
          title,
          tooltip: getTooltipStyle({
            chartType: "bar",
            valueFormatter: formatChartValue,
          }),
          xAxis: {
            ...xAxis,
            type: "category",
            data: groupedSeries.categories,
            boundaryGap: false,
          },
          yAxis: {
            ...yAxis,
            type: "value",
            axisLabel: {
              ...yAxis.axisLabel,
              formatter: (value) => formatNumber(value),
            },
          },
          series: groupedSeries.seriesData.map((seriesItem, index) => ({
            name: seriesItem.name,
            type: "line",
            smooth: isSmooth === true,
            step: type === "step-line" ? "middle" : false,
            symbol: "circle",
            symbolSize: 7,
            showSymbol: true,
            lineStyle: {
              width: 3,
              color: palette.colors[index % palette.colors.length],
            },
            itemStyle: {
              color: palette.colors[index % palette.colors.length],
              borderColor: tokens.surface,
              borderWidth: 2,
            },
            emphasis: {
              focus: "series",
              lineStyle: {
                width: 3.5,
              },
              scale: true,
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
            stack: type === "stacked-area" ? "total" : undefined,
            areaStyle: (type === "area" || type === "stacked-area")
              ? {
                  color: createAreaFill(palette.colors[index % palette.colors.length], 0.16, 0.03),
                }
              : undefined,
            data: seriesItem.data,
          })),
        };
      }

      return {
        ...baseOption,
        title,
        tooltip: getTooltipStyle({
          chartType: "bar",
          valueFormatter: formatChartValue,
        }),
        xAxis: {
          ...xAxis,
          type: "category",
          data: chartData.map((row) => asLabel(row[xField])),
          boundaryGap: false,
        },
        yAxis: {
          ...yAxis,
          type: "value",
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        series: [
          {
            name: displayTitle,
            type: "line",
            smooth: isSmooth === true,
            step: type === "step-line" ? "middle" : false,
            symbol: "circle",
            symbolSize: 7,
            showSymbol: true,
            lineStyle: {
              width: 3,
              color: palette.single,
            },
            itemStyle: {
              color: palette.single,
              borderColor: tokens.surface,
              borderWidth: 2,
            },
            emphasis: {
              focus: "series",
              lineStyle: {
                width: 3.5,
              },
              scale: true,
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
            stack: type === "stacked-area" ? "total" : undefined,
            areaStyle: (type === "area" || type === "stacked-area")
              ? {
                  color: createAreaFill(palette.single, 0.16, 0.03),
                }
              : undefined,
            data: chartData.map((row) => ({
              value: Number(row[yField]) || 0,
              rawDatum: row,
            })),
          },
        ],
      };

    case "bar":
    case "horizontal-bar":
      if (groupField) {
        const groupedSeries = buildSeriesDataset(chartData, xField, yField, groupField);

        return {
          ...baseOption,
          title,
          xAxis: type === "horizontal-bar"
            ? {
                ...xAxis,
                type: "value",
                axisLabel: {
                  ...xAxis.axisLabel,
                  formatter: (value) => formatNumber(value),
                },
              }
            : {
                ...xAxis,
                type: "category",
                data: groupedSeries.categories,
              },
          yAxis: type === "horizontal-bar"
            ? {
                ...yAxis,
                type: "category",
                data: groupedSeries.categories,
              }
            : {
                ...yAxis,
                type: "value",
                axisLabel: {
                  ...yAxis.axisLabel,
                  formatter: (value) => formatNumber(value),
                },
              },
          series: groupedSeries.seriesData.map((seriesItem, index) => ({
            name: seriesItem.name,
            type: "bar",
            barWidth: "45%",
            barMaxWidth: 28,
            itemStyle: {
              color: createBarFill(palette.colors[index % palette.colors.length]),
              borderRadius: [0, 0, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                color: darkenColor(palette.colors[index % palette.colors.length], 0.08),
                borderRadius: [0, 0, 0, 0],
              },
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
            data: seriesItem.data,
          })),
        };
      }

      return {
        ...baseOption,
        title,
        tooltip: getTooltipStyle({
          chartType: type,
          valueFormatter: formatChartValue,
        }),
        xAxis: type === "horizontal-bar"
          ? {
              ...xAxis,
              type: "value",
              axisLabel: {
                ...xAxis.axisLabel,
                formatter: (value) => formatNumber(value),
              },
            }
          : {
              ...xAxis,
              type: "category",
              data: chartData.map((row) => asLabel(row[xField])),
            },
        yAxis: type === "horizontal-bar"
          ? {
              ...yAxis,
              type: "category",
              data: chartData.map((row) => asLabel(row[xField])),
            }
          : {
              ...yAxis,
              type: "value",
              axisLabel: {
                ...yAxis.axisLabel,
                formatter: (value) => formatNumber(value),
              },
            },
        series: [
          {
            name: displayTitle,
            type: "bar",
            barWidth: "45%",
            barMaxWidth: 32,
            itemStyle: {
              color: createBarFill(palette.single),
              borderRadius: [0, 0, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                color: darkenColor(palette.single, 0.08),
                borderRadius: [0, 0, 0, 0],
              },
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
            data: chartData.map((row) => ({
              value: Number(row[yField]) || 0,
              rawDatum: row,
            })),
          },
        ],
      };

    case "grouped-bar":
    case "stacked-bar":
      return {
        ...baseOption,
        title,
        xAxis: {
          ...xAxis,
          type: "category",
          data: chartData.map((row) => asLabel(row[xField])),
        },
        yAxis: {
          ...yAxis,
          type: "value",
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        series: seriesKeys.map((key, index) => ({
          name: key,
          type: "bar",
          stack: type === "stacked-bar" ? "total" : undefined,
          barWidth: "45%",
          barMaxWidth: 28,
          itemStyle: {
            color: createBarFill(palette.colors[index % palette.colors.length]),
            borderRadius: [0, 0, 0, 0],
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              color: darkenColor(palette.colors[index % palette.colors.length], 0.08),
              borderRadius: [0, 0, 0, 0],
            },
          },
          label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
          data: chartData.map((row) => ({
            value: Number(row[key]) || 0,
            rawDatum: {
              [xField]: row[xField],
              [groupField]: key,
            },
          })),
        })),
      };

    case "pie":
    case "donut":
    case "rose":
      return {
        ...baseOption,
        title,
        tooltip: {
          ...getTooltipStyle({
            chartType: type,
            trigger: "item",
            valueFormatter: formatChartValue,
          }),
          formatter: (params) => `${params.name}<br/>${params.seriesName}: ${formatNumber(params.value)}`,
        },
        legend: showLegend
          ? {
              ...baseOption.legend,
              type: "scroll",
            }
          : undefined,
        series: [
          {
            name: displayTitle,
            type: "pie",
            radius: type === "donut" ? ["54%", "80%"] : type === "rose" ? ["18%", "78%"] : ["0%", "80%"],
            center: ["50%", "46%"],
            roseType: type === "rose" ? "radius" : undefined,
            itemStyle: {
              borderColor: tokens.surface,
              borderWidth: 1,
            },
            label: {
              ...buildSeriesLabel(chart?.showLabels, tokens, ({ name, percent }) => `${name}\n${percent}%`),
            },
            labelLine: {
              lineStyle: {
                color: tokens.borderStrong,
              },
            },
            data: chartData.map((row, index) => ({
              name: asLabel(row[xField]),
              value: Number(row[yField]) || 0,
              itemStyle: {
                color: palette.colors[index % palette.colors.length],
              },
              rawDatum: row,
            })),
          },
        ],
      };

    case "scatter":
    case "bubble":
      return {
        ...baseOption,
        title,
        xAxis: {
          ...xAxis,
          type: "value",
          axisLabel: {
            ...xAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        yAxis: {
          ...yAxis,
          type: "value",
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => {
            const datum = params.data?.rawDatum ?? {};
            return `${displayTitle}<br/>${xField}: ${formatNumber(Number(datum[xField]) || 0)}<br/>${yField}: ${formatNumber(Number(datum[yField]) || 0)}`;
          },
        },
        series: [
          {
            name: displayTitle,
            type: "scatter",
            symbolSize: (value) => {
              if (type !== "bubble") return 12;
              const size = Number(value?.[2]) || 0;
              return Math.max(14, Math.min(40, Math.sqrt(Math.abs(size)) * 3.6));
            },
            itemStyle: {
              color: palette.single,
              opacity: type === "bubble" ? 0.7 : 0.84,
              borderColor: tokens.surface,
              borderWidth: 1,
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.[1])),
            data: chartData.map((row) => ({
              value: [
                Number(row[xField]) || 0,
                Number(row[yField]) || 0,
                type === "bubble"
                  ? Number(row[sizeField]) || Number(row[yField]) || 0
                  : Number(row[yField]) || 0,
              ],
              rawDatum: row,
            })),
          },
        ],
      };

    case "heatmap": {
      const heatmap = buildHeatmapSeries(chartData, xField, yField, groupField);

      return {
        ...baseOption,
        title,
        grid: {
          top: 20,
          right: 18,
          bottom: showLegend ? 78 : 30,
          left: 90,
          containLabel: true,
        },
        xAxis: {
          ...xAxis,
          type: "category",
          data: heatmap.columns,
          splitArea: { show: false },
        },
        yAxis: {
          ...yAxis,
          type: "category",
          data: heatmap.rows,
          splitArea: { show: false },
        },
        visualMap: {
          min: 0,
          max: heatmap.max || 1,
          orient: "horizontal",
          left: 10,
          bottom: 10,
          textStyle: {
            color: tokens.textMuted,
            fontSize: 11,
          },
          inRange: {
            color: [
              withOpacity(tokens.body, 0.9),
              withOpacity(palette.single, 0.26),
              palette.single,
            ],
          },
        },
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => {
            const datum = params.data ?? {};
            return `${datum.rowValue} / ${datum.columnValue}<br/>${formatNumber(params.value?.[2])}`;
          },
        },
        series: [
          {
            name: displayTitle,
            type: "heatmap",
            data: heatmap.values,
            label: {
              show: true,
              color: tokens.textBase,
              fontSize: 11,
              formatter: ({ value }) => formatNumber(value?.[2]),
            },
            itemStyle: {
              borderColor: withOpacity(tokens.surface, 0.9),
              borderWidth: 1,
            },
            emphasis: {
              itemStyle: {
                borderColor: tokens.textStrong,
                borderWidth: 1,
              },
            },
          },
        ],
      };
    }

    case "histogram":
      return {
        ...baseOption,
        title,
        xAxis: {
          ...xAxis,
          type: "category",
          data: chartData.map((row) => row.range),
        },
        yAxis: {
          ...yAxis,
          type: "value",
          minInterval: 1,
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        tooltip: {
          ...getTooltipStyle({
            chartType: "histogram",
            trigger: "item",
            valueFormatter: formatChartValue,
          }),
          formatter: (params) => `${params.name}<br/>Count: ${formatNumber(params.value)}`,
        },
        series: [
          {
            name: "Count",
            type: "bar",
            barWidth: "45%",
            barMaxWidth: 36,
            itemStyle: {
              color: createBarFill(palette.single),
              borderRadius: [0, 0, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                color: darkenColor(palette.single, 0.08),
                borderRadius: [0, 0, 0, 0],
              },
            },
            label: buildSeriesLabel(chart?.showLabels, tokens, ({ value }) => formatNumber(value?.value ?? value)),
            data: chartData.map((row) => ({
              value: Number(row.count) || 0,
              rawDatum: row,
            })),
          },
        ],
      };

    case "radar": {
      const radar = buildRadarSeries({
        chartData,
        seriesKeys,
        xField,
        yField,
        groupField,
        palette,
        displayTitle,
      });

      return {
        ...baseOption,
        title,
        legend: showLegend
          ? {
              ...baseOption.legend,
              bottom: 0,
            }
          : undefined,
        radar: {
          radius: "62%",
          splitNumber: 4,
          indicator: radar.indicators,
          axisName: {
            color: tokens.textMuted,
            fontSize: 11,
          },
          splitArea: {
            areaStyle: {
              color: [withOpacity(tokens.body, 0.32), withOpacity(tokens.surface, 0.24)],
            },
          },
          splitLine: {
            lineStyle: {
              color: withOpacity(tokens.grid, 0.9),
            },
          },
          axisLine: {
            lineStyle: {
              color: withOpacity(tokens.grid, 0.9),
            },
          },
        },
        series: [
          {
            type: "radar",
            data: radar.series,
          },
        ],
      };
    }

    case "gauge": {
      const gaugeDatum = chartData[0] ?? { value: 0, actual: 0, max: 100 };
      const maximum = Math.max(Number(gaugeDatum.max) || 100, 1);

      return {
        ...baseOption,
        title,
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: () => `${displayTitle}<br/>${formatNumber(gaugeDatum.actual)} / ${formatNumber(maximum)}`,
        },
        series: [
          {
            name: displayTitle,
            type: "gauge",
            min: 0,
            max: maximum,
            startAngle: 210,
            endAngle: -30,
            progress: {
              show: true,
              width: 14,
              itemStyle: {
                color: palette.single,
              },
            },
            axisLine: {
              lineStyle: {
                width: 14,
                color: [[1, withOpacity(tokens.borderStrong, 0.58)]],
              },
            },
            splitLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: tokens.textMuted,
              distance: 10,
              fontSize: 10,
            },
            pointer: {
              show: true,
              length: "58%",
              width: 4,
              itemStyle: {
                color: tokens.textStrong,
              },
            },
            detail: {
              valueAnimation: false,
              offsetCenter: [0, "36%"],
              formatter: () => `${formatNumber(gaugeDatum.actual)}`,
              color: tokens.textStrong,
              fontSize: 26,
              fontWeight: 700,
            },
            title: {
              offsetCenter: [0, "72%"],
              color: tokens.textMuted,
              fontSize: 11,
            },
            data: [
              {
                value: Number(gaugeDatum.actual) || 0,
                name: displayTitle,
              },
            ],
          },
        ],
      };
    }

    case "progress-ring": {
      const progressDatum = chartData[0] ?? { actual: 0, max: 100 };
      const actual = Number(progressDatum.actual ?? progressDatum.value ?? progressDatum[yField]) || 0;
      const maximum = Math.max(Number(progressDatum.max) || Math.max(actual, 100), 1);
      const remaining = Math.max(maximum - actual, 0);

      return {
        ...baseOption,
        title,
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => `${params.name}<br/>${formatNumber(params.value)}`,
        },
        title: {
          text: `${Math.round((actual / maximum) * 100)}%`,
          subtext: displayTitle,
          left: "center",
          top: "38%",
          textStyle: {
            color: tokens.textStrong,
            fontSize: 26,
            fontWeight: 700,
          },
          subtextStyle: {
            color: tokens.textMuted,
            fontSize: 11,
          },
        },
        series: [
          {
            type: "pie",
            radius: ["58%", "76%"],
            center: ["50%", "46%"],
            silent: true,
            label: { show: false },
            data: [
              { value: actual, name: "Progress", itemStyle: { color: palette.single } },
              { value: remaining, name: "Remaining", itemStyle: { color: withOpacity(tokens.borderStrong, 0.48) } },
            ],
          },
        ],
      };
    }

    case "funnel":
      return {
        ...baseOption,
        title,
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => `${params.name}<br/>${formatNumber(params.value)}`,
        },
        series: [
          {
            name: displayTitle,
            type: "funnel",
            left: "10%",
            top: 16,
            bottom: showLegend ? 72 : 20,
            width: "80%",
            minSize: "18%",
            maxSize: "100%",
            sort: "descending",
            gap: 2,
            label: {
              color: tokens.textBase,
              fontSize: 11,
            },
            labelLine: {
              lineStyle: {
                color: tokens.borderStrong,
              },
            },
            itemStyle: {
              borderColor: tokens.surface,
              borderWidth: 2,
            },
            data: chartData.map((row, index) => ({
              name: asLabel(row[xField]),
              value: Number(row[yField]) || 0,
              itemStyle: {
                color: palette.colors[index % palette.colors.length],
              },
              rawDatum: row,
            })),
          },
        ],
      };

    case "treemap":
      return {
        ...baseOption,
        title,
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => `${params.name}<br/>${formatNumber(params.value)}`,
        },
        series: [
          {
            type: "treemap",
            roam: false,
            breadcrumb: { show: false },
            itemStyle: {
              borderColor: tokens.surface,
              borderWidth: 1,
              gapWidth: 1,
            },
            label: {
              color: tokens.textBase,
              fontSize: 11,
            },
            upperLabel: {
              show: true,
              color: tokens.textStrong,
              fontSize: 11,
              height: 20,
            },
            levels: [{ color: palette.colors }],
            data: buildHierarchySeries(chartData, xField, yField, groupField),
          },
        ],
      };

    case "sunburst":
      return {
        ...baseOption,
        title,
        tooltip: {
          ...baseOption.tooltip,
          trigger: "item",
          formatter: (params) => `${params.name}<br/>${formatNumber(params.value)}`,
        },
        series: [
          {
            type: "sunburst",
            radius: ["18%", "84%"],
            sort: undefined,
            itemStyle: {
              borderWidth: 1,
              borderColor: tokens.surface,
            },
            label: {
              rotate: "radial",
              color: tokens.textBase,
              fontSize: 11,
            },
            levels: [{}, { itemStyle: { color: palette.colors[0] } }],
            data: buildHierarchySeries(chartData, xField, yField, groupField),
          },
        ],
      };

    case "waterfall": {
      const waterfall = buildWaterfallSeries(chartData, xField, yField);
      return {
        ...baseOption,
        title,
        xAxis: {
          ...xAxis,
          type: "category",
          data: waterfall.categories,
        },
        yAxis: {
          ...yAxis,
          type: "value",
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: (value) => formatNumber(value),
          },
        },
        tooltip: {
          ...baseOption.tooltip,
          trigger: "axis",
        },
        series: [
          {
            type: "bar",
            stack: "total",
            silent: true,
            itemStyle: {
              color: "transparent",
              borderColor: "transparent",
            },
            emphasis: {
              itemStyle: {
                color: "transparent",
                borderColor: "transparent",
              },
            },
            data: waterfall.base,
          },
          {
            name: displayTitle,
            type: "bar",
            stack: "total",
            itemStyle: {
              color: createBarFill(palette.single),
              borderRadius: [0, 0, 0, 0],
            },
            data: waterfall.values,
          },
        ],
      };
    }

    default:
      return null;
  }
}

export function buildChartClickPayload({ type, params, xField, groupField }) {
  if (!params) return null;

  if (type === "heatmap") {
    return {
      rowField: params.data?.rowField,
      rowValue: params.data?.rowValue,
      columnField: params.data?.columnField,
      columnValue: params.data?.columnValue,
    };
  }

  if (type === "grouped-bar" || type === "stacked-bar") {
    return {
      payload: {
        [xField]: params.name,
        [groupField]: params.seriesName,
      },
    };
  }

  if (type === "radar") {
    return groupField
      ? {
          payload: {
            [groupField]: params.name,
          },
        }
      : null;
  }

  if (params.data?.rawDatum) {
    return { payload: params.data.rawDatum };
  }

  return null;
}
