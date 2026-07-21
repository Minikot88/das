import type { DemoDatasetRow } from "@/components/dashboard-v2/services/datasetService";
import type {
  Aggregation,
  ChartConfig,
  ChartDataRow,
  ChartType,
  DataField,
  FilterValue,
  MappingSlot,
  MappingSlotId,
  SortMode,
  TransformedChartData,
} from "@/components/dashboard-v2/types";
import { aggregateRows, groupByRows, isNumericField, toNumber, toText, uniqueFields } from "@/components/dashboard-v2/utils/chartAggregations";
import { clampPercent } from "@/components/dashboard-v2/utils/chartFormatters";

export { formatValue } from "@/components/dashboard-v2/utils/chartFormatters";

const monthOrder = new Map([
  ["ม.ค.", 1],
  ["ก.พ.", 2],
  ["มี.ค.", 3],
  ["เม.ย.", 4],
  ["พ.ค.", 5],
  ["มิ.ย.", 6],
  ["ก.ค.", 7],
  ["ส.ค.", 8],
  ["ก.ย.", 9],
  ["ต.ค.", 10],
  ["พ.ย.", 11],
  ["ธ.ค.", 12],
]);

type DataRow = Record<string, string | number | boolean>;

export function getMappingSlot(mappings: MappingSlot[], slotId: MappingSlotId) {
  return mappings.find((slot) => slot.id === slotId);
}

export function getPrimaryField(mappings: MappingSlot[], slotId: MappingSlotId) {
  return getMappingSlot(mappings, slotId)?.fields[0];
}

function getFields(mappings: MappingSlot[], slotIds: MappingSlotId[]) {
  return uniqueFields(slotIds.flatMap((slotId) => getMappingSlot(mappings, slotId)?.fields ?? []));
}

function firstField(mappings: MappingSlot[], slotIds: MappingSlotId[]) {
  return getFields(mappings, slotIds)[0];
}

function passesFilter(row: DemoDatasetRow, field: DataField, filter?: FilterValue) {
  if (!filter) return true;
  const value = row[field.id];

  if (filter.type === "text" || filter.type === "boolean") {
    return filter.values.length === 0 || filter.values.includes(String(value));
  }

  if (filter.type === "number") {
    const numeric = toNumber(value);
    const minPass = filter.min === "" || numeric >= filter.min;
    const maxPass = filter.max === "" || numeric <= filter.max;
    return minPass && maxPass;
  }

  if (filter.type === "date") {
    const dateValue = String(value);
    const startPass = !filter.start || dateValue >= filter.start;
    const endPass = !filter.end || dateValue <= filter.end;
    return startPass && endPass;
  }

  return true;
}

export function applyFilters(rows: DemoDatasetRow[], mappings: MappingSlot[], filters: ChartConfig["filters"]) {
  const filterFields = getMappingSlot(mappings, "filter")?.fields ?? [];
  return rows.filter((row) => filterFields.every((field) => passesFilter(row, field, filters[field.id])));
}

function aggregationFor(mappings: MappingSlot[], slotId: MappingSlotId, fallback: Aggregation = "Sum") {
  return getMappingSlot(mappings, slotId)?.aggregation ?? fallback;
}

function buildTableRows(rows: DemoDatasetRow[], columns: DataField[]) {
  return rows.slice(0, 120).map((row) =>
    columns.reduce<DataRow>((current, column) => {
      current[column.id] = row[column.id];
      return current;
    }, {})
  );
}

function createSeriesKey(field: DataField, legendValue?: string) {
  return legendValue ? `${field.id}__${legendValue}` : field.id;
}

function getSelectedColumns(mappings: MappingSlot[], allFields: DataField[]) {
  const selected = uniqueFields(mappings.flatMap((slot) => slot.fields));
  return selected.length ? selected : allFields.slice(0, 10);
}

function sortValue(row: ChartDataRow, seriesKeys: string[]) {
  const key = seriesKeys[0];
  return key ? toNumber(row[key]) : 0;
}

function sortChartRows(rows: ChartDataRow[], sortMode: SortMode, xField: DataField | undefined, seriesKeys: string[]) {
  if (sortMode === "none") return rows;

  return [...rows].sort((a, b) => {
    if (sortMode === "byValueAscending") return sortValue(a, seriesKeys) - sortValue(b, seriesKeys);
    if (sortMode === "byValueDescending") return sortValue(b, seriesKeys) - sortValue(a, seriesKeys);

    const left = toText(a.rawName ?? a.name);
    const right = toText(b.rawName ?? b.name);

    if (sortMode === "monthOrder" || xField?.semanticType === "month" || xField?.id === "month") {
      return (monthOrder.get(left) ?? 99) - (monthOrder.get(right) ?? 99);
    }
    if (sortMode === "dateOrder" || xField?.type === "date") {
      return new Date(left).getTime() - new Date(right).getTime();
    }
    if (sortMode === "ascending") return left.localeCompare(right, "th", { numeric: true });
    if (sortMode === "descending") return right.localeCompare(left, "th", { numeric: true });
    if (xField && isNumericField(xField)) return toNumber(a.rawName ?? a.name) - toNumber(b.rawName ?? b.name);
    return left.localeCompare(right, "th", { numeric: true });
  });
}

function buildDimensionRows(rows: DemoDatasetRow[], dimensionField: DataField | undefined, measureField: DataField | undefined, aggregation: Aggregation) {
  if (!dimensionField || !measureField) return [];
  return Array.from(groupByRows(rows, dimensionField).entries())
    .map(([name, groupRows]) => ({ name, value: aggregateRows(groupRows, measureField, aggregation) }))
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
}

function calculateTrend(chartRows: ChartDataRow[], seriesKeys: string[]) {
  if (chartRows.length < 2 || !seriesKeys[0]) return 0;
  const first = toNumber(chartRows[0][seriesKeys[0]]);
  const last = toNumber(chartRows[chartRows.length - 1][seriesKeys[0]]);
  if (!first) return last > 0 ? 100 : 0;
  return ((last - first) / Math.abs(first)) * 100;
}

function calculateGaugePercent(rows: DemoDatasetRow[], allFields: DataField[], valueField: DataField | undefined, aggregation: Aggregation) {
  if (!valueField) return 0;
  if (valueField.type === "percentage") return clampPercent(aggregateRows(rows, valueField, aggregation) * 100);
  const targetField = allFields.find((field) => field.id === "target");
  const target = aggregateRows(rows, targetField, "Sum");
  const value = aggregateRows(rows, valueField, aggregation);
  return clampPercent(target ? (value / target) * 100 : value);
}

function buildHeatmapRows(
  rows: DemoDatasetRow[],
  xField: DataField | undefined,
  yField: DataField | undefined,
  valueField: DataField | undefined,
  aggregation: Aggregation
) {
  if (!xField || !yField || !valueField) return [];
  const grouped = new Map<string, DemoDatasetRow[]>();
  rows.forEach((row) => {
    const key = `${toText(row[xField.id])}|||${toText(row[yField.id])}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  });
  return Array.from(grouped.entries()).map(([key, groupRows]) => {
    const [x, y] = key.split("|||");
    return { x, y, value: aggregateRows(groupRows, valueField, aggregation) };
  });
}

function buildWaterfallRows(rows: ChartDataRow[], seriesKeys: string[]) {
  const key = seriesKeys[0];
  let running = 0;
  return rows.map((row) => {
    const signedValue = key ? toNumber(row[key]) : 0;
    const start = running;
    running += signedValue;
    return {
      name: toText(row.name),
      value: Math.abs(signedValue),
      start,
      end: running,
      positive: signedValue >= 0,
    };
  });
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function buildBoxplotRows(rows: DemoDatasetRow[], categoryField: DataField | undefined, valueField: DataField | undefined) {
  if (!categoryField || !valueField) return [];
  return Array.from(groupByRows(rows, categoryField).entries()).map(([name, groupRows]) => {
    const values = groupRows.map((row) => toNumber(row[valueField.id])).sort((a, b) => a - b);
    return {
      name,
      values: [
        values[0] ?? 0,
        quantile(values, 0.25),
        quantile(values, 0.5),
        quantile(values, 0.75),
        values[values.length - 1] ?? 0,
      ] as [number, number, number, number, number],
    };
  });
}

function buildSankeyRows(rows: DemoDatasetRow[], sourceField: DataField | undefined, targetField: DataField | undefined, valueField: DataField | undefined) {
  if (!sourceField || !targetField) return { nodes: [], links: [] };
  const linksMap = new Map<string, { source: string; target: string; value: number }>();
  rows.forEach((row) => {
    const source = toText(row[sourceField.id]);
    const target = toText(row[targetField.id]);
    if (!source || !target) return;
    const key = `${source}|||${target}`;
    const current = linksMap.get(key) ?? { source, target, value: 0 };
    current.value += valueField ? toNumber(row[valueField.id]) : 1;
    linksMap.set(key, current);
  });
  const links = Array.from(linksMap.values());
  const nodeNames = new Set<string>();
  links.forEach((link) => {
    nodeNames.add(link.source);
    nodeNames.add(link.target);
  });
  return {
    nodes: Array.from(nodeNames).map((name) => ({ name })),
    links,
  };
}

function buildSunburstRows(rows: DemoDatasetRow[], hierarchyFields: DataField[], valueField: DataField | undefined, aggregation: Aggregation) {
  if (hierarchyFields.length < 2 || !valueField) return [];
  const firstLevel = new Map<string, DemoDatasetRow[]>();
  rows.forEach((row) => {
    const key = toText(row[hierarchyFields[0].id]);
    const bucket = firstLevel.get(key) ?? [];
    bucket.push(row);
    firstLevel.set(key, bucket);
  });

  return Array.from(firstLevel.entries()).map(([name, firstRows]) => {
    const secondLevel = new Map<string, DemoDatasetRow[]>();
    firstRows.forEach((row) => {
      const key = toText(row[hierarchyFields[1].id]);
      const bucket = secondLevel.get(key) ?? [];
      bucket.push(row);
      secondLevel.set(key, bucket);
    });
    return {
      name,
      value: aggregateRows(firstRows, valueField, aggregation),
      children: Array.from(secondLevel.entries()).map(([childName, childRows]) => {
        const thirdField = hierarchyFields[2];
        if (!thirdField) return { name: childName, value: aggregateRows(childRows, valueField, aggregation) };
        const thirdLevel = new Map<string, DemoDatasetRow[]>();
        childRows.forEach((row) => {
          const key = toText(row[thirdField.id]);
          const bucket = thirdLevel.get(key) ?? [];
          bucket.push(row);
          thirdLevel.set(key, bucket);
        });
        return {
          name: childName,
          value: aggregateRows(childRows, valueField, aggregation),
          children: Array.from(thirdLevel.entries()).map(([leafName, leafRows]) => ({
            name: leafName,
            value: aggregateRows(leafRows, valueField, aggregation),
          })),
        };
      }),
    };
  });
}

function buildCalendarRows(rows: DemoDatasetRow[], dateField: DataField | undefined, valueField: DataField | undefined, aggregation: Aggregation) {
  if (!dateField || !valueField) return [];
  return Array.from(groupByRows(rows, dateField).entries())
    .map(([date, groupRows]) => [date, aggregateRows(groupRows, valueField, aggregation)] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function buildCandlestickRows(
  rows: DemoDatasetRow[],
  dateField: DataField | undefined,
  openField: DataField | undefined,
  highField: DataField | undefined,
  lowField: DataField | undefined,
  closeField: DataField | undefined
) {
  if (!dateField || !openField || !highField || !lowField || !closeField) return [];
  return Array.from(groupByRows(rows, dateField).entries())
    .map(([name, groupRows]) => ({
      name,
      values: [
        aggregateRows(groupRows, openField, "Average"),
        aggregateRows(groupRows, closeField, "Average"),
        aggregateRows(groupRows, lowField, "Min"),
        aggregateRows(groupRows, highField, "Max"),
      ] as [number, number, number, number],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildParallelRows(rows: DemoDatasetRow[], valueFields: DataField[]) {
  if (valueFields.length < 3) return { dimensions: [], rows: [] };
  return {
    dimensions: valueFields.map((field) => field.name),
    rows: rows.slice(0, 100).map((row) => valueFields.map((field) => toNumber(row[field.id]))),
  };
}

function emptyData(
  config: ChartConfig,
  filteredRows: DemoDatasetRow[],
  tableColumns: DataField[],
  tableRows: DataRow[],
  aggregation: Aggregation,
  xField?: DataField,
  yField?: DataField,
  legendField?: DataField
): TransformedChartData {
  return {
    rows: [],
    filteredRows,
    seriesKeys: [],
    seriesLabels: {},
    pieRows: [],
    heatmapRows: [],
    treemapRows: [],
    funnelRows: [],
    waterfallRows: [],
    boxplotRows: [],
    sankeyNodes: [],
    sankeyLinks: [],
    sunburstRows: [],
    calendarRows: [],
    candlestickRows: [],
    graphNodes: [],
    graphLinks: [],
    parallelRows: [],
    parallelDimensions: [],
    pivotColumns: [],
    tableColumns,
    tableRows,
    kpiValue: yField ? aggregateRows(filteredRows, yField, aggregation) : 0,
    kpiTrend: 0,
    kpiLabel: yField?.name ?? "ค่า",
    gaugePercent: 0,
    metadata: {
      chartType: config.chartType,
      rowCount: tableRows.length,
      filteredRowCount: filteredRows.length,
      aggregation,
    },
    xField,
    yField,
    legendField,
  };
}

function tableLikeChart(chartType: ChartType | null) {
  return chartType === "table" || chartType === "summary-table" || chartType === "pivot-table" || chartType === "matrix-table";
}

export function transformChartData(
  rows: DemoDatasetRow[],
  config: ChartConfig,
  allFields: DataField[]
): TransformedChartData {
  const mappings = config.mappings;
  const filteredRows = applyFilters(rows, mappings, config.filters);
  const xField = firstField(mappings, ["xAxis", "category", "rows"]);
  const horizontalCategoryField = config.chartType === "horizontal-bar" ? firstField(mappings, ["yAxis", "category", "rows", "xAxis"]) : undefined;
  const categoryField = firstField(mappings, ["category", "legend", "xAxis", "rows"]) ?? horizontalCategoryField;
  const valueFields = getFields(mappings, ["value", "yAxis"]).filter(isNumericField);
  const yFields = valueFields.length ? valueFields : getFields(mappings, ["yAxis"]).filter(isNumericField);
  const valueField = valueFields[0] ?? yFields[0];
  const legendField = firstField(mappings, ["legend", "series", "color", "columns"]);
  const tooltipFields = getFields(mappings, ["tooltip"]);
  const sizeField = firstField(mappings, ["size"]);
  const rowsFields = getFields(mappings, ["rows"]);
  const sourceField = firstField(mappings, ["source"]);
  const targetField = firstField(mappings, ["target"]);
  const openField = firstField(mappings, ["open"]);
  const highField = firstField(mappings, ["high"]);
  const lowField = firstField(mappings, ["low"]);
  const closeField = firstField(mappings, ["close"]);
  const aggregation = aggregationFor(mappings, valueFields.length ? "value" : "yAxis", "Sum");
  const tableColumns = getSelectedColumns(mappings, allFields);
  const tableRows = buildTableRows(filteredRows, tableColumns);

  if ((config.chartType === "scatter" || config.chartType === "bubble" || config.chartType === "correlation-scatter") && xField && valueField) {
    const scatterRows = filteredRows.map((row, index) => {
      const chartRow: ChartDataRow = {
        name: `${index + 1}`,
        rawName: `${index + 1}`,
        [xField.id]: toNumber(row[xField.id]),
        [valueField.id]: toNumber(row[valueField.id]),
      };
      if (sizeField) chartRow[sizeField.id] = toNumber(row[sizeField.id]);
      if (legendField) chartRow[legendField.id] = toText(row[legendField.id]);
      tooltipFields.forEach((field) => {
        chartRow[field.id] = row[field.id];
      });
      return chartRow;
    });
    const sankey = buildSankeyRows(filteredRows, sourceField, targetField, valueField);
    const parallel = buildParallelRows(filteredRows, yFields);

    return {
      rows: scatterRows,
      filteredRows,
      seriesKeys: [valueField.id],
      seriesLabels: { [valueField.id]: valueField.name },
      pieRows: [],
      heatmapRows: [],
      treemapRows: [],
      funnelRows: [],
      waterfallRows: [],
      boxplotRows: [],
      sankeyNodes: sankey.nodes,
      sankeyLinks: sankey.links,
      sunburstRows: buildSunburstRows(filteredRows, rowsFields, valueField, aggregation),
      calendarRows: buildCalendarRows(filteredRows, xField.type === "date" ? xField : firstField(mappings, ["xAxis"]), valueField, aggregation),
      candlestickRows: buildCandlestickRows(filteredRows, xField, openField, highField, lowField, closeField),
      graphNodes: sankey.nodes.map((node) => ({ name: node.name, symbolSize: 24 })),
      graphLinks: sankey.links,
      parallelRows: parallel.rows,
      parallelDimensions: parallel.dimensions,
      pivotColumns: [],
      tableColumns,
      tableRows,
      kpiValue: aggregateRows(filteredRows, valueField, aggregation),
      kpiTrend: 0,
      kpiLabel: valueField.name,
      gaugePercent: calculateGaugePercent(filteredRows, allFields, valueField, aggregation),
      metadata: { chartType: config.chartType, rowCount: rows.length, filteredRowCount: filteredRows.length, aggregation },
      xField,
      yField: valueField,
      legendField,
    };
  }

  if (!valueField && !tableLikeChart(config.chartType)) {
    return emptyData(config, filteredRows, tableColumns, tableRows, aggregation, xField, valueField, legendField);
  }

  const groupField = config.chartType === "horizontal-bar" ? horizontalCategoryField ?? categoryField : xField ?? categoryField;
  const grouped = groupField ? groupByRows(filteredRows, groupField) : groupByRows(filteredRows, undefined);
  const legendValues = legendField
    ? Array.from(new Set(filteredRows.map((row) => toText(row[legendField.id])))).sort((a, b) => a.localeCompare(b, "th"))
    : [];
  const seriesLabels: Record<string, string> = {};
  const seriesKeys = new Set<string>();

  const chartRows: ChartDataRow[] = Array.from(grouped.entries()).map(([groupName, groupRows]) => {
    const chartRow: ChartDataRow = { name: groupName, rawName: groupName };

    if (legendField && legendValues.length > 0 && valueField) {
      legendValues.forEach((legendValue) => {
        const seriesKey = createSeriesKey(valueField, legendValue);
        const legendRows = groupRows.filter((row) => toText(row[legendField.id]) === legendValue);
        chartRow[seriesKey] = aggregateRows(legendRows, valueField, aggregation);
        seriesKeys.add(seriesKey);
        seriesLabels[seriesKey] = legendValue;
      });
    } else {
      yFields.forEach((field) => {
        const seriesKey = createSeriesKey(field);
        chartRow[seriesKey] = aggregateRows(groupRows, field, aggregationFor(mappings, "yAxis", field.defaultAggregation === "None" ? "Sum" : field.defaultAggregation));
        seriesKeys.add(seriesKey);
        seriesLabels[seriesKey] = field.name;
      });
    }

    tooltipFields.forEach((field) => {
      chartRow[field.id] = groupRows[0]?.[field.id];
    });

    return chartRow;
  });

  const sortMode = config.chartType === "ranking-bar" || config.chartType === "top-n-bar" ? "byValueDescending" : config.sort;
  const sortedRows = sortChartRows(chartRows, sortMode, groupField, Array.from(seriesKeys));
  const limitedRows = config.chartType === "top-n-bar" ? sortedRows.slice(0, 10) : sortedRows;
  const dimensionForComposition = categoryField ?? legendField ?? groupField;
  const dimensionRows = buildDimensionRows(filteredRows, dimensionForComposition, valueField, aggregation);
  const heatmapRows = buildHeatmapRows(filteredRows, firstField(mappings, ["xAxis"]), firstField(mappings, ["yAxis", "legend", "category"]), valueField, aggregation);
  const treemapRows = dimensionRows.map((row) => ({ name: row.name, size: row.value, group: dimensionForComposition?.name }));
  const funnelRows = dimensionRows.map((row) => ({ name: row.name, value: row.value }));
  const waterfallRows = buildWaterfallRows(limitedRows, Array.from(seriesKeys));
  const boxplotRows = buildBoxplotRows(filteredRows, categoryField ?? groupField, valueField);
  const sankey = buildSankeyRows(filteredRows, sourceField, targetField, valueField);
  const hierarchyFields = rowsFields.length >= 2 ? rowsFields : uniqueFields([firstField(mappings, ["category"]), firstField(mappings, ["legend"]), firstField(mappings, ["series"])]);
  const sunburstRows = buildSunburstRows(filteredRows, hierarchyFields, valueField, aggregation);
  const calendarRows = buildCalendarRows(filteredRows, firstField(mappings, ["xAxis"]), valueField, aggregation);
  const candlestickRows = buildCandlestickRows(filteredRows, firstField(mappings, ["xAxis"]), openField, highField, lowField, closeField);
  const parallel = buildParallelRows(filteredRows, valueFields.length >= 3 ? valueFields : yFields);
  const kpiValue = valueField ? aggregateRows(filteredRows, valueField, aggregation) : 0;
  const kpiTrend = calculateTrend(limitedRows, Array.from(seriesKeys));

  return {
    rows: limitedRows,
    filteredRows,
    seriesKeys: Array.from(seriesKeys),
    seriesLabels,
    pieRows: dimensionRows,
    heatmapRows,
    treemapRows,
    funnelRows,
    waterfallRows,
    boxplotRows,
    sankeyNodes: sankey.nodes,
    sankeyLinks: sankey.links,
    sunburstRows,
    calendarRows,
    candlestickRows,
    graphNodes: sankey.nodes.map((node) => ({ name: node.name, symbolSize: 24 })),
    graphLinks: sankey.links,
    parallelRows: parallel.rows,
    parallelDimensions: parallel.dimensions,
    pivotColumns: legendValues,
    tableColumns,
    tableRows,
    kpiValue,
    kpiTrend,
    kpiLabel: valueField?.name ?? "ค่า",
    gaugePercent: calculateGaugePercent(filteredRows, allFields, valueField, aggregation),
    metadata: {
      chartType: config.chartType,
      rowCount: rows.length,
      filteredRowCount: filteredRows.length,
      aggregation,
    },
    xField: groupField,
    yField: valueField,
    legendField,
  };
}

export function exportRowsToCsv(rows: DataRow[], columns: DataField[]) {
  const header = columns.map((column) => `"${column.name.replace(/"/g, '""')}"`).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) => {
        const value = row[column.id] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [header, ...body].join("\n");
}
