import React from "react";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BubbleChartRoundedIcon from "@mui/icons-material/BubbleChartRounded";
import DonutLargeRoundedIcon from "@mui/icons-material/DonutLargeRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MultilineChartRoundedIcon from "@mui/icons-material/MultilineChartRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import ScatterPlotRoundedIcon from "@mui/icons-material/ScatterPlotRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import StackedBarChartRoundedIcon from "@mui/icons-material/StackedBarChartRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import type {
  ChartCategory,
  ChartCategoryDefinition,
  ChartDefinition,
  ChartRendererType,
  ChartSettingKey,
  ChartType,
  MappingRequirement,
  RegistryAggregation,
} from "@/components/dashboard-v2/types";
import type { DataField, MappingSlot } from "@/components/dashboard-v2/types";

function icon(component: React.ElementType) {
  return React.createElement(component);
}

function mapping(
  slot: MappingRequirement["slot"],
  label: string,
  allowedTypes: DataField["type"][],
  required: boolean,
  minFields = 1
): MappingRequirement {
  return {
    slot,
    zone: slot,
    label,
    required,
    types: allowedTypes,
    allowedTypes,
    minFields,
  };
}

const dimensions: DataField["type"][] = ["text", "date", "boolean", "geography", "number"];
const categories: DataField["type"][] = ["text", "date", "geography", "boolean", "number"];
const measures: DataField["type"][] = ["number", "currency", "percentage"];
const allAggregations: RegistryAggregation[] = ["sum", "average", "min", "max", "count", "countDistinct", "median", "first", "last"];
const defaultSettings: ChartSettingKey[] = ["general", "axis", "labels", "legend", "colors", "grid", "tooltip", "animation"];

export const chartCategories: ChartCategoryDefinition[] = [
  { id: "all", label: "ทั้งหมด", icon: icon(AutoGraphRoundedIcon) },
  { id: "basic", label: "พื้นฐาน", icon: icon(BarChartRoundedIcon) },
  { id: "comparison", label: "เปรียบเทียบ", icon: icon(StackedBarChartRoundedIcon) },
  { id: "trend", label: "แนวโน้ม", icon: icon(ShowChartRoundedIcon) },
  { id: "composition", label: "สัดส่วน", icon: icon(DonutLargeRoundedIcon) },
  { id: "distribution", label: "กระจายตัว", icon: icon(GridOnRoundedIcon) },
  { id: "relationship", label: "ความสัมพันธ์", icon: icon(ScatterPlotRoundedIcon) },
  { id: "kpi", label: "KPI", icon: icon(TrendingUpRoundedIcon) },
  { id: "table", label: "ตาราง", icon: icon(TableChartRoundedIcon) },
  { id: "advanced", label: "ขั้นสูง", icon: icon(InsightsRoundedIcon) },
];

function createDefinition(args: {
  id: ChartType;
  category: ChartCategory;
  name: string;
  thaiName: string;
  description: string;
  renderer: ChartRendererType;
  iconNode: React.ReactElement;
  requiredMappings: MappingRequirement[];
  optionalMappings?: MappingRequirement[];
  supportedSettings?: ChartSettingKey[];
  supportedAggregations?: RegistryAggregation[];
  sampleMapping?: Partial<Record<MappingRequirement["slot"], string[]>>;
  validation?: string[];
  enabled?: boolean;
  advanced?: boolean;
  recommended?: boolean;
  comingSoon?: boolean;
  disabledReason?: string;
}): ChartDefinition {
  const optionalMappings = args.optionalMappings ?? [];
  return {
    id: args.id,
    label: args.name,
    name: args.name,
    thaiName: args.thaiName,
    description: args.description,
    category: args.category,
    icon: args.iconNode,
    renderer: args.renderer,
    rendererType: args.renderer,
    requirements: [...args.requiredMappings, ...optionalMappings],
    requiredMappings: args.requiredMappings,
    optionalMappings,
    sampleMapping: args.sampleMapping ?? Object.fromEntries(args.requiredMappings.map((item) => [item.slot, []])),
    validation: args.validation ?? args.requiredMappings.map((item) => `${item.label} (${item.slot})`),
    supportedAggregations: args.supportedAggregations ?? allAggregations,
    supportedSettings: args.supportedSettings ?? defaultSettings,
    enabled: args.enabled ?? true,
    advanced: args.advanced ?? args.category === "advanced",
    recommended: args.recommended,
    comingSoon: args.comingSoon,
    disabledReason: args.disabledReason,
  };
}

const barIcon = icon(BarChartRoundedIcon);
const stackIcon = icon(StackedBarChartRoundedIcon);
const lineIcon = icon(ShowChartRoundedIcon);
const multiLineIcon = icon(MultilineChartRoundedIcon);
const areaIcon = icon(InsightsRoundedIcon);
const pieIcon = icon(PieChartRoundedIcon);
const donutIcon = icon(DonutLargeRoundedIcon);
const scatterIcon = icon(ScatterPlotRoundedIcon);
const bubbleIcon = icon(BubbleChartRoundedIcon);
const kpiIcon = icon(TrendingUpRoundedIcon);
const tableIcon = icon(TableChartRoundedIcon);
const gridIcon = icon(GridOnRoundedIcon);
const speedIcon = icon(SpeedRoundedIcon);
const moduleIcon = icon(ViewModuleRoundedIcon);
const autoIcon = icon(AutoGraphRoundedIcon);
const treeIcon = icon(AccountTreeRoundedIcon);
const hubIcon = icon(HubRoundedIcon);
const timelineIcon = icon(TimelineRoundedIcon);

export const chartRegistry: ChartDefinition[] = [
  createDefinition({
    id: "bar",
    category: "basic",
    name: "Bar Chart",
    thaiName: "กราฟแท่ง",
    description: "เปรียบเทียบค่าตามหมวดหมู่หรือเวลา",
    renderer: "bar",
    iconNode: barIcon,
    requiredMappings: [mapping("xAxis", "แกนนอน", categories, true), mapping("yAxis", "แกนตั้ง", measures, true)],
    optionalMappings: [mapping("legend", "คำอธิบาย", categories, false), mapping("tooltip", "Tooltip", dimensions, false)],
    recommended: true,
  }),
  createDefinition({
    id: "horizontal-bar",
    category: "basic",
    name: "Horizontal Bar",
    thaiName: "แท่งแนวนอน",
    description: "เปรียบเทียบค่าโดยใช้แกนหมวดหมู่แนวตั้ง",
    renderer: "bar",
    iconNode: barIcon,
    requiredMappings: [mapping("xAxis", "ค่า", measures, true), mapping("yAxis", "หมวดหมู่", categories, true)],
    optionalMappings: [mapping("tooltip", "Tooltip", dimensions, false)],
  }),
  createDefinition({
    id: "stacked-bar",
    category: "comparison",
    name: "Stacked Bar",
    thaiName: "แท่งซ้อน",
    description: "แสดงส่วนประกอบของแต่ละหมวดหมู่",
    renderer: "bar",
    iconNode: stackIcon,
    requiredMappings: [mapping("xAxis", "แกนนอน", categories, true), mapping("yAxis", "ค่า", measures, true), mapping("legend", "กลุ่ม", categories, true)],
    recommended: true,
  }),
  createDefinition({
    id: "line",
    category: "trend",
    name: "Line Chart",
    thaiName: "กราฟเส้น",
    description: "ดูแนวโน้มตามเวลา",
    renderer: "line",
    iconNode: lineIcon,
    requiredMappings: [mapping("xAxis", "เวลา/หมวดหมู่", ["date", "text"], true), mapping("yAxis", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "กลุ่ม", categories, false)],
    recommended: true,
  }),
  createDefinition({
    id: "area",
    category: "trend",
    name: "Area Chart",
    thaiName: "กราฟพื้นที่",
    description: "เน้นปริมาณและแนวโน้มสะสม",
    renderer: "area",
    iconNode: areaIcon,
    requiredMappings: [mapping("xAxis", "เวลา/หมวดหมู่", ["date", "text"], true), mapping("yAxis", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "กลุ่ม", categories, false)],
  }),
  createDefinition({
    id: "multi-line",
    category: "trend",
    name: "Multi Line",
    thaiName: "เส้นหลายชุด",
    description: "เปรียบเทียบแนวโน้มหลายกลุ่ม",
    renderer: "line",
    iconNode: multiLineIcon,
    requiredMappings: [mapping("xAxis", "เวลา/หมวดหมู่", dimensions, true), mapping("yAxis", "ค่า", measures, true), mapping("legend", "กลุ่ม", categories, true)],
  }),
  createDefinition({
    id: "stacked-area",
    category: "trend",
    name: "Stacked Area",
    thaiName: "พื้นที่ซ้อน",
    description: "แสดงสัดส่วนสะสมตามเวลา",
    renderer: "area",
    iconNode: areaIcon,
    requiredMappings: [mapping("xAxis", "เวลา/หมวดหมู่", dimensions, true), mapping("yAxis", "ค่า", measures, true), mapping("legend", "กลุ่ม", categories, true)],
  }),
  createDefinition({
    id: "combo-bar-line",
    category: "trend",
    name: "Combo Bar Line",
    thaiName: "แท่งและเส้น",
    description: "ผสมแท่งและเส้นด้วยอย่างน้อยสองค่า",
    renderer: "combo",
    iconNode: autoIcon,
    requiredMappings: [mapping("xAxis", "แกนนอน", dimensions, true), mapping("yAxis", "ค่าอย่างน้อย 2 ค่า", measures, true, 2)],
  }),
  createDefinition({
    id: "pie",
    category: "composition",
    name: "Pie Chart",
    thaiName: "วงกลม",
    description: "แสดงสัดส่วนของหมวดหมู่",
    renderer: "pie",
    iconNode: pieIcon,
    requiredMappings: [mapping("category", "หมวดหมู่", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "หมวดหมู่", categories, false), mapping("yAxis", "ค่า", measures, false)],
  }),
  createDefinition({
    id: "donut",
    category: "composition",
    name: "Donut Chart",
    thaiName: "โดนัท",
    description: "แสดงสัดส่วนแบบวงแหวน",
    renderer: "donut",
    iconNode: donutIcon,
    requiredMappings: [mapping("category", "หมวดหมู่", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "หมวดหมู่", categories, false), mapping("yAxis", "ค่า", measures, false)],
  }),
  createDefinition({
    id: "scatter",
    category: "relationship",
    name: "Scatter",
    thaiName: "กระจาย",
    description: "ดูความสัมพันธ์ระหว่างตัวเลขสองค่า",
    renderer: "scatter",
    iconNode: scatterIcon,
    requiredMappings: [mapping("xAxis", "ค่า X", measures, true), mapping("yAxis", "ค่า Y", measures, true)],
    optionalMappings: [mapping("tooltip", "Tooltip", dimensions, false), mapping("color", "สี", categories, false)],
  }),
  createDefinition({
    id: "bubble",
    category: "relationship",
    name: "Bubble",
    thaiName: "บับเบิล",
    description: "Scatter พร้อมขนาดฟอง",
    renderer: "bubble",
    iconNode: bubbleIcon,
    requiredMappings: [mapping("xAxis", "ค่า X", measures, true), mapping("yAxis", "ค่า Y", measures, true), mapping("size", "ขนาด", measures, true)],
  }),
  createDefinition({
    id: "radar",
    category: "comparison",
    name: "Radar",
    thaiName: "เรดาร์",
    description: "เปรียบเทียบค่าหลายมิติบนแกนรัศมี",
    renderer: "radar",
    iconNode: autoIcon,
    requiredMappings: [mapping("category", "มิติ", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("xAxis", "มิติ", categories, false), mapping("yAxis", "ค่า", measures, false)],
  }),
  createDefinition({
    id: "gauge",
    category: "kpi",
    name: "Gauge",
    thaiName: "เกจ",
    description: "แสดงค่าปัจจุบันเทียบเป้าหมาย",
    renderer: "gauge",
    iconNode: speedIcon,
    requiredMappings: [mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("yAxis", "ค่า", measures, false), mapping("target", "เป้าหมาย", measures, false)],
    supportedSettings: ["general", "labels", "colors", "tooltip", "animation"],
  }),
  createDefinition({
    id: "funnel",
    category: "composition",
    name: "Funnel",
    thaiName: "ฟันเนล",
    description: "แสดงขั้นตอนและการลดลง",
    renderer: "funnel",
    iconNode: moduleIcon,
    requiredMappings: [mapping("category", "ขั้นตอน", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "ขั้นตอน", categories, false), mapping("yAxis", "ค่า", measures, false)],
  }),
  createDefinition({
    id: "treemap",
    category: "composition",
    name: "Treemap",
    thaiName: "ทรีแมป",
    description: "แสดงสัดส่วนด้วยพื้นที่",
    renderer: "treemap",
    iconNode: moduleIcon,
    requiredMappings: [mapping("category", "หมวดหมู่", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("series", "กลุ่ม", categories, false), mapping("legend", "หมวดหมู่", categories, false), mapping("yAxis", "ค่า", measures, false)],
  }),
  createDefinition({
    id: "heatmap",
    category: "distribution",
    name: "Heatmap",
    thaiName: "ฮีตแมป",
    description: "แสดงความหนาแน่นของค่าสองมิติ",
    renderer: "heatmap",
    iconNode: gridIcon,
    requiredMappings: [mapping("xAxis", "มิติ X", dimensions, true), mapping("yAxis", "มิติ Y", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("legend", "มิติ Y", categories, false)],
  }),
  createDefinition({
    id: "kpi-card",
    category: "kpi",
    name: "KPI Card",
    thaiName: "การ์ด KPI",
    description: "สรุปค่าหลักหนึ่งตัว",
    renderer: "kpi-card",
    iconNode: kpiIcon,
    requiredMappings: [mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("yAxis", "ค่า", measures, false), mapping("xAxis", "เวลา", dimensions, false)],
    supportedSettings: ["general", "colors", "tooltip", "animation"],
    recommended: true,
  }),
  createDefinition({
    id: "table",
    category: "table",
    name: "Table",
    thaiName: "ตาราง",
    description: "แสดงข้อมูลระดับแถวด้วย MUI Table",
    renderer: "table",
    iconNode: tableIcon,
    requiredMappings: [mapping("rows", "ฟิลด์", dimensions, true)],
    optionalMappings: [mapping("xAxis", "ฟิลด์", dimensions, false), mapping("yAxis", "ค่า", measures, false)],
    supportedSettings: ["general", "colors"],
  }),
  createDefinition({
    id: "pivot-table",
    category: "table",
    name: "Pivot Table",
    thaiName: "Pivot Table",
    description: "สรุปข้อมูลแบบ pivot พื้นฐาน",
    renderer: "pivot-table",
    iconNode: tableIcon,
    requiredMappings: [mapping("rows", "แถว", dimensions, true), mapping("columns", "คอลัมน์", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("xAxis", "แถว", dimensions, false), mapping("legend", "คอลัมน์", categories, false), mapping("yAxis", "ค่า", measures, false)],
    supportedSettings: ["general", "colors"],
  }),
  createDefinition({
    id: "sunburst",
    category: "advanced",
    name: "Sunburst",
    thaiName: "Sunburst",
    description: "แสดง hierarchy หลายชั้นพร้อมค่ารวม",
    renderer: "sunburst",
    iconNode: treeIcon,
    requiredMappings: [mapping("rows", "Hierarchy อย่างน้อย 2 ฟิลด์", categories, true, 2), mapping("value", "ค่า", measures, true)],
    advanced: true,
  }),
  createDefinition({
    id: "sankey",
    category: "advanced",
    name: "Sankey",
    thaiName: "Sankey",
    description: "แสดง flow จากต้นทางไปปลายทาง",
    renderer: "sankey",
    iconNode: hubIcon,
    requiredMappings: [mapping("source", "ต้นทาง", categories, true), mapping("target", "ปลายทาง", categories, true), mapping("value", "ค่า", measures, true)],
    advanced: true,
  }),
  createDefinition({
    id: "candlestick",
    category: "advanced",
    name: "Candlestick",
    thaiName: "Candlestick",
    description: "แสดงข้อมูล OHLC ตามวันที่",
    renderer: "candlestick",
    iconNode: timelineIcon,
    requiredMappings: [
      mapping("xAxis", "วันที่", ["date", "text"], true),
      mapping("open", "Open", measures, true),
      mapping("high", "High", measures, true),
      mapping("low", "Low", measures, true),
      mapping("close", "Close", measures, true),
    ],
    advanced: true,
  }),
  createDefinition({
    id: "boxplot",
    category: "advanced",
    name: "Boxplot",
    thaiName: "Boxplot",
    description: "คำนวณ min, Q1, median, Q3, max",
    renderer: "boxplot",
    iconNode: gridIcon,
    requiredMappings: [mapping("category", "หมวดหมู่", categories, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("xAxis", "หมวดหมู่", categories, false), mapping("yAxis", "ค่า", measures, false)],
    advanced: true,
  }),
  createDefinition({
    id: "waterfall",
    category: "advanced",
    name: "Waterfall",
    thaiName: "Waterfall",
    description: "คำนวณค่าเริ่มต้น/สิ้นสุดสะสม",
    renderer: "waterfall",
    iconNode: autoIcon,
    requiredMappings: [mapping("category", "ลำดับ", dimensions, true), mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("xAxis", "ลำดับ", dimensions, false), mapping("yAxis", "ค่า", measures, false)],
    advanced: true,
  }),
  createDefinition({
    id: "calendar-heatmap",
    category: "advanced",
    name: "Calendar Heatmap",
    thaiName: "Calendar Heatmap",
    description: "แสดงค่าตามวันที่บนปฏิทิน",
    renderer: "calendar-heatmap",
    iconNode: gridIcon,
    requiredMappings: [mapping("xAxis", "วันที่", ["date"], true), mapping("value", "ค่า", measures, true)],
    advanced: true,
  }),
  createDefinition({
    id: "graph-network",
    category: "advanced",
    name: "Graph Network",
    thaiName: "Graph Network",
    description: "แสดงความสัมพันธ์ของ node และ edge",
    renderer: "graph-network",
    iconNode: hubIcon,
    requiredMappings: [mapping("source", "Node", categories, true), mapping("target", "Target", categories, true)],
    optionalMappings: [mapping("value", "ค่า", measures, false)],
    advanced: true,
  }),
  createDefinition({
    id: "parallel-coordinates",
    category: "advanced",
    name: "Parallel Coordinates",
    thaiName: "Parallel Coordinates",
    description: "เปรียบเทียบหลายตัวเลขในแกนขนาน",
    renderer: "parallel-coordinates",
    iconNode: multiLineIcon,
    requiredMappings: [mapping("value", "ตัวเลขหลายฟิลด์", measures, true, 3)],
    optionalMappings: [mapping("yAxis", "ตัวเลขหลายฟิลด์", measures, false, 3)],
    advanced: true,
  }),
  createDefinition({
    id: "progress-ring",
    category: "kpi",
    name: "Progress Ring",
    thaiName: "วงแหวนความคืบหน้า",
    description: "แสดงเปอร์เซ็นต์ความสำเร็จ",
    renderer: "gauge",
    iconNode: donutIcon,
    requiredMappings: [mapping("value", "ค่า", measures, true)],
    optionalMappings: [mapping("yAxis", "ค่า", measures, false)],
    supportedSettings: ["general", "labels", "colors", "tooltip", "animation"],
  }),
];

export function getChartDefinition(chartType: ChartType | null | undefined) {
  return chartRegistry.find((chart) => chart.id === chartType);
}

export function isChartRecommended(chart: ChartDefinition, mappings: MappingSlot[]) {
  if (chart.recommended) return true;
  const fields = mappings.flatMap((slot) => slot.fields);
  const xField = mappings.find((slot) => slot.id === "xAxis")?.fields[0];
  const yField = mappings.find((slot) => slot.id === "yAxis" || slot.id === "value")?.fields[0];
  const legendField = mappings.find((slot) => slot.id === "legend")?.fields[0];
  const hasOhlc = ["date", "open", "high", "low", "close"].every((id) => fields.some((field) => field.id === id));
  const hasFlow = ["source", "targetNode", "flowValue"].every((id) => fields.some((field) => field.id === id));

  if (hasOhlc && chart.id === "candlestick") return true;
  if (hasFlow && chart.id === "sankey") return true;
  if (!yField) return false;
  if ((xField?.type === "date" || xField?.semanticType === "month") && ["line", "area", "bar", "calendar-heatmap"].includes(chart.id)) return true;
  if (legendField && ["stacked-bar", "multi-line", "stacked-area"].includes(chart.id)) return true;
  if (xField?.isDimension && yField.isMeasure && ["bar", "horizontal-bar", "pie", "donut", "treemap"].includes(chart.id)) return true;
  if (xField?.isMeasure && yField.isMeasure && ["scatter", "bubble"].includes(chart.id)) return true;
  return false;
}
