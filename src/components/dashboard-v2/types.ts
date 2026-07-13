export type {
  ChartCategory,
  ChartCategoryDefinition,
  ChartDefinition,
  ChartRendererType,
  ChartSettingKey,
  ChartType,
  MappingRequirement,
  RegistryAggregation,
} from "./types/chartTypes";

export type FieldType = "date" | "number" | "text" | "boolean" | "currency" | "percentage" | "geography";

export type SemanticType =
  | "date"
  | "month"
  | "quarter"
  | "year"
  | "category"
  | "product"
  | "location"
  | "channel"
  | "currency"
  | "quantity"
  | "percentage"
  | "score"
  | "boolean"
  | "ohlc"
  | "network"
  | "flow";

export type DataField = {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  semanticType: SemanticType;
  table: string;
  description: string;
  sampleValues: Array<string | number | boolean>;
  isMeasure: boolean;
  isDimension: boolean;
  defaultAggregation: Aggregation;
};

export type MappingSlotId =
  | "xAxis"
  | "yAxis"
  | "legend"
  | "tooltip"
  | "filter"
  | "color"
  | "size"
  | "value"
  | "category"
  | "series"
  | "rows"
  | "columns"
  | "source"
  | "target"
  | "open"
  | "high"
  | "low"
  | "close";

export type Aggregation = "None" | "Sum" | "Average" | "Min" | "Max" | "Count" | "Count Distinct" | "Median" | "First" | "Last";

export type SortMode =
  | "none"
  | "ascending"
  | "descending"
  | "byValueAscending"
  | "byValueDescending"
  | "monthOrder"
  | "dateOrder";

export type MappingSlot = {
  id: MappingSlotId;
  label: string;
  helper: string;
  fields: DataField[];
  aggregation?: Aggregation;
};

export type DeviceMode = "desktop" | "tablet" | "mobile";

export type DemoThemeId =
  | "default-blue"
  | "executive-dark"
  | "minimal-gray"
  | "business-green"
  | "premium-purple"
  | "warm-orange";

export type DragFieldItem = {
  type: "FIELD";
  field: DataField;
  sourceSlotId?: MappingSlotId;
};

export type FilterValue =
  | { type: "text" | "boolean"; values: string[] }
  | { type: "number"; min: number | ""; max: number | "" }
  | { type: "date"; start: string; end: string };

export type ChartSettings = {
  general: {
    title: string;
    subtitle: string;
    showTitle: boolean;
    showSubtitle: boolean;
    backgroundColor: string;
    padding: number;
    radius: number;
    themePreset?: DemoThemeId;
  };
  axis: {
    showXAxis: boolean;
    showYAxis: boolean;
    showAxisLabels: boolean;
    xAxisLabel: string;
    yAxisLabel: string;
    rotateXLabels: 0 | 30 | 45 | 90;
    numberFormat: "default" | "compact" | "currency" | "percent";
    dateFormat: "MMM" | "MMM YYYY" | "DD/MM/YYYY";
  };
  labels: {
    showDataLabels: boolean;
    position: "top" | "inside" | "outside";
    fontSize: number;
    color: string;
  };
  legend: {
    showLegend: boolean;
    position: "top" | "bottom" | "left" | "right";
    align: "start" | "center" | "end";
    fontSize: number;
  };
  colors: {
    palette: "default" | "business" | "pastel" | "vivid" | "monochrome";
    seriesColors: string[];
    opacity: number;
    borderColor: string;
  };
  grid: {
    showGrid: boolean;
    lineType: "solid" | "dashed" | "dotted";
    opacity: number;
    color: string;
  };
  tooltip: {
    enabled: boolean;
    theme: "light" | "dark";
    borderRadius: number;
    showSeriesName: boolean;
    showFormattedValue: boolean;
  };
  animation: {
    enabled: boolean;
    duration: number;
    easing: "ease" | "ease-in" | "ease-out" | "ease-in-out";
  };
};

export type ChartConfig = {
  schemaVersion: number;
  dashboardId: string;
  chartId: string;
  chartType: import("./types/chartTypes").ChartType | null;
  mappings: MappingSlot[];
  settings: ChartSettings;
  filters: Record<string, FilterValue>;
  sort: SortMode;
  textElements: string[];
  imageName: string | null;
  sourceType: "demo" | "demo-sql" | "dataset" | "api";
  datasetId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ValidationResult = {
  valid: boolean;
  title: string;
  message: string;
  requirements: string[];
};

export type ChartDataRow = {
  name: string;
  rawName?: string;
  [key: string]: string | number | boolean | undefined;
};

export type TransformedChartData = {
  rows: ChartDataRow[];
  filteredRows: Record<string, string | number | boolean>[];
  seriesKeys: string[];
  seriesLabels: Record<string, string>;
  pieRows: Array<{ name: string; value: number; fill?: string }>;
  heatmapRows: Array<{ x: string; y: string; value: number }>;
  treemapRows: Array<{ name: string; size: number; group?: string }>;
  funnelRows: Array<{ name: string; value: number }>;
  waterfallRows: Array<{ name: string; value: number; start: number; end: number; positive: boolean }>;
  boxplotRows: Array<{ name: string; values: [number, number, number, number, number] }>;
  sankeyNodes: Array<{ name: string }>;
  sankeyLinks: Array<{ source: string; target: string; value: number }>;
  sunburstRows: Array<{ name: string; value?: number; children?: Array<{ name: string; value?: number; children?: Array<{ name: string; value: number }> }> }>;
  calendarRows: Array<[string, number]>;
  candlestickRows: Array<{ name: string; values: [number, number, number, number] }>;
  graphNodes: Array<{ name: string; value?: number; symbolSize?: number }>;
  graphLinks: Array<{ source: string; target: string; value?: number }>;
  parallelRows: number[][];
  parallelDimensions: string[];
  pivotColumns: string[];
  tableColumns: DataField[];
  tableRows: Record<string, string | number | boolean>[];
  kpiValue: number;
  kpiTrend: number;
  kpiLabel: string;
  gaugePercent: number;
  metadata: {
    chartType: import("./types/chartTypes").ChartType | null;
    rowCount: number;
    filteredRowCount: number;
    aggregation: Aggregation;
  };
  xField?: DataField;
  yField?: DataField;
  legendField?: DataField;
};
