import type { ChartConfig, ChartSettings, MappingSlot, MappingSlotId } from "@/components/dashboard-v2/types";
import { getDatasetSchema } from "@/components/dashboard-v2/services/datasetService";
import { chartRegistry } from "@/components/dashboard-v2/utils/chartRegistry";

export const dataFields = getDatasetSchema("researchdb").fields;
export const chartCatalog = chartRegistry;

function field(id: string) {
  return dataFields.find((item) => item.id === id);
}

function slot(id: MappingSlotId, label: string, helper: string, fieldIds: string[] = [], aggregation: MappingSlot["aggregation"] = "None"): MappingSlot {
  return {
    id,
    label,
    helper,
    fields: fieldIds.map(field).filter((item): item is NonNullable<ReturnType<typeof field>> => Boolean(item)),
    aggregation,
  };
}

export const initialMappings: MappingSlot[] = [
  slot("xAxis", "X Axis", "มิติสำหรับแกนนอน", ["month"], "None"),
  slot("yAxis", "Y Axis", "ค่าที่ต้องการวัด", ["sales"], "Sum"),
  slot("legend", "Legend", "แบ่งกลุ่มซีรีส์"),
  slot("tooltip", "Tooltip", "ข้อมูลเสริมเมื่อ hover", ["product"], "None"),
  slot("filter", "Filter", "ฟิลด์สำหรับกรองข้อมูล"),
  slot("color", "Color", "มิติหรือค่าสำหรับสี"),
  slot("size", "Size", "ตัวเลขสำหรับขนาด"),
  slot("value", "Value", "ค่าหลักของกราฟ", [], "Sum"),
  slot("category", "Category", "มิติหลักของกราฟ"),
  slot("series", "Series", "ซีรีส์หรือกลุ่มข้อมูล"),
  slot("rows", "Rows", "ลำดับชั้นหรือแถว"),
  slot("columns", "Columns", "คอลัมน์สำหรับ pivot"),
  slot("source", "Source", "ต้นทางของ flow"),
  slot("target", "Target", "ปลายทางของ flow"),
  slot("open", "Open", "ราคาเปิดสำหรับ OHLC", [], "Average"),
  slot("high", "High", "ราคาสูงสุดสำหรับ OHLC", [], "Average"),
  slot("low", "Low", "ราคาต่ำสุดสำหรับ OHLC", [], "Average"),
  slot("close", "Close", "ราคาปิดสำหรับ OHLC", [], "Average"),
];

export const defaultChartSettings: ChartSettings = {
  general: {
    title: "ยอดขายรายเดือน",
    subtitle: "สรุปยอดขายจากชุดข้อมูล sales_performance",
    showTitle: true,
    showSubtitle: true,
    backgroundColor: "#FFFFFF",
    padding: 20,
    radius: 4,
    themePreset: "default-blue",
  },
  axis: {
    showXAxis: true,
    showYAxis: true,
    showAxisLabels: true,
    xAxisLabel: "เดือน",
    yAxisLabel: "ยอดขาย",
    rotateXLabels: 0,
    numberFormat: "default",
    dateFormat: "MMM",
  },
  labels: {
    showDataLabels: false,
    position: "top",
    fontSize: 11,
    color: "#172033",
  },
  legend: {
    showLegend: true,
    position: "top",
    align: "center",
    fontSize: 11,
  },
  colors: {
    palette: "default",
    seriesColors: ["#2563EB", "#E85D75", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#64748B"],
    opacity: 92,
    borderColor: "#ECEFF5",
  },
  grid: {
    showGrid: true,
    lineType: "dashed",
    opacity: 45,
    color: "#EEF2F7",
  },
  tooltip: {
    enabled: true,
    theme: "light",
    borderRadius: 4,
    showSeriesName: true,
    showFormattedValue: true,
  },
  animation: {
    enabled: true,
    duration: 420,
    easing: "ease-out",
  },
};

export function createDefaultConfig(): ChartConfig {
  const now = new Date().toISOString();
  return {
    schemaVersion: 3,
    dashboardId: "dashboard-v2-local",
    chartId: "chart-v2-main",
    chartType: "bar",
    mappings: initialMappings.map((mapping) => ({ ...mapping, fields: [...mapping.fields] })),
    settings: structuredClone(defaultChartSettings),
    filters: {},
    sort: "monthOrder",
    textElements: [],
    imageName: null,
    sourceType: "demo",
    datasetId: "sales_performance",
    version: 3,
    createdAt: now,
    updatedAt: now,
  };
}
