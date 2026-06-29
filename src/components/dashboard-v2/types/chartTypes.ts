import type { ReactNode } from "react";

export type ChartCategory =
  | "all"
  | "basic"
  | "comparison"
  | "trend"
  | "composition"
  | "distribution"
  | "relationship"
  | "kpi"
  | "table"
  | "advanced";

export type ChartType =
  | "bar"
  | "clustered-bar"
  | "stacked-bar"
  | "horizontal-bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "table"
  | "kpi-card"
  | "column"
  | "grouped-column"
  | "stacked-column"
  | "ranking-bar"
  | "top-n-bar"
  | "multi-line"
  | "stacked-area"
  | "combo-bar-line"
  | "time-series-line"
  | "sparkline"
  | "treemap"
  | "sunburst"
  | "sankey"
  | "candlestick"
  | "boxplot"
  | "calendar-heatmap"
  | "graph-network"
  | "parallel-coordinates"
  | "sunburst-placeholder"
  | "100-percent-stacked-bar"
  | "100-percent-stacked-column"
  | "histogram"
  | "box-plot-placeholder"
  | "density-placeholder"
  | "heatmap"
  | "calendar-heatmap-placeholder"
  | "scatter"
  | "bubble"
  | "correlation-scatter"
  | "kpi-trend"
  | "gauge"
  | "progress-ring"
  | "metric-card"
  | "scorecard"
  | "pivot-table"
  | "matrix-table"
  | "summary-table"
  | "waterfall"
  | "funnel"
  | "radar"
  | "polar-area"
  | "radial-bar"
  | "bullet-chart";

export type ChartRendererType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "bubble"
  | "kpi-card"
  | "kpi-trend"
  | "gauge"
  | "progress-ring"
  | "table"
  | "pivot-table"
  | "heatmap"
  | "treemap"
  | "funnel"
  | "radar"
  | "waterfall"
  | "combo"
  | "sunburst"
  | "sankey"
  | "candlestick"
  | "boxplot"
  | "calendar-heatmap"
  | "graph-network"
  | "parallel-coordinates"
  | "unsupported";

export type ChartSettingKey =
  | "general"
  | "axis"
  | "labels"
  | "legend"
  | "colors"
  | "grid"
  | "tooltip"
  | "animation"
  | "advanced"
  | "title"
  | "subtitle"
  | "palette"
  | "padding"
  | "radius"
  | "background"
  | "numberFormat"
  | "dateFormat";

export type MappingRequirement = {
  slot:
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
  zone?: string;
  label: string;
  required: boolean;
  types?: Array<"date" | "number" | "text" | "boolean" | "currency" | "percentage" | "geography">;
  allowedTypes?: Array<"date" | "number" | "text" | "boolean" | "currency" | "percentage" | "geography">;
  minFields?: number;
  maxFields?: number;
  measureRole?: "dimension" | "measure" | "any";
};

export type RegistryAggregation =
  | "sum"
  | "average"
  | "min"
  | "max"
  | "count"
  | "countDistinct"
  | "median"
  | "first"
  | "last";

export type ChartDefinition = {
  id: ChartType;
  label: string;
  name: string;
  thaiName: string;
  description: string;
  category: ChartCategory;
  icon: ReactNode;
  renderer: ChartRendererType;
  rendererType: ChartRendererType;
  requirements: MappingRequirement[];
  requiredMappings: MappingRequirement[];
  optionalMappings: MappingRequirement[];
  sampleMapping: Partial<Record<MappingRequirement["slot"], string[]>>;
  validation: string[];
  supportedAggregations?: RegistryAggregation[];
  supportedSettings: ChartSettingKey[];
  enabled: boolean;
  advanced: boolean;
  recommended?: boolean;
  comingSoon?: boolean;
  disabledReason?: string;
};

export type ChartCategoryDefinition = {
  id: ChartCategory;
  label: string;
  description?: string;
  icon: ReactNode;
};
