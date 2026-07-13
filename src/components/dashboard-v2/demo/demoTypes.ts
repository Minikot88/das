import type { Aggregation, ChartSettings, ChartType, DemoThemeId, MappingSlotId, SortMode } from "../types";

export type { DemoThemeId } from "../types";

export type DemoSettingsPatch = {
  [K in keyof ChartSettings]?: Partial<ChartSettings[K]>;
};

export type DemoMappingPreset = {
  slotId: MappingSlotId;
  fieldIds: string[];
  aggregation?: Aggregation;
};

export type DemoThemePreset = {
  id: DemoThemeId;
  name: string;
  description: string;
  backgroundColor: string;
  palette: ChartSettings["colors"]["palette"];
  seriesColors: string[];
  gridColor: string;
  gridOpacity: number;
  tooltipTheme: ChartSettings["tooltip"]["theme"];
  textColor: string;
};

export type DemoTemplate = {
  id: string;
  name: string;
  description: string;
  audience: string;
  chartType: ChartType;
  themeId: DemoThemeId;
  mappings: DemoMappingPreset[];
  settings: DemoSettingsPatch;
  sort?: SortMode;
  insights: string[];
};

export type ChartPreset = {
  id: string;
  name: string;
  description: string;
  chartType: ChartType;
  chartTypes: ChartType[];
  themeId?: DemoThemeId;
  mappings: DemoMappingPreset[];
  settings: DemoSettingsPatch;
  sort?: SortMode;
  badge?: "แนะนำ" | "ขายดี" | "เดโม";
};

export type DemoInsight = {
  id: string;
  title: string;
  description: string;
  severity: "info" | "success" | "warning";
};

export type FutureFeature = {
  id: string;
  title: string;
  description: string;
  plannedPhase: string;
};
