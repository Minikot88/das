import type { ChartConfig, TransformedChartData } from "@/components/dashboard-v2/types";
import type { DemoInsight } from "@/components/dashboard-v2/demo/demoTypes";

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { notation: value >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function firstNumericKey(data: TransformedChartData) {
  return data.seriesKeys[0] ?? "value";
}

export function createDemoInsights(data: TransformedChartData, config: ChartConfig, templateInsights: string[] = []): DemoInsight[] {
  const insights: DemoInsight[] = [];
  const numericKey = firstNumericKey(data);
  const chartRows = data.rows.filter((row) => typeof row[numericKey] === "number");

  if (templateInsights.length) {
    templateInsights.slice(0, 2).forEach((description, index) => {
      insights.push({
        id: `template-${index}`,
        title: index === 0 ? "Insight สำหรับเดโม" : "จุดเล่าเรื่อง",
        description,
        severity: index === 0 ? "success" : "info",
      });
    });
  }

  if (chartRows.length) {
    const sorted = [...chartRows].sort((a, b) => Number(b[numericKey]) - Number(a[numericKey]));
    const top = sorted[0];
    const low = sorted[sorted.length - 1];
    const topName = String(top.name ?? top.rawName ?? "รายการสูงสุด");
    const lowName = String(low.name ?? low.rawName ?? "รายการต่ำสุด");
    insights.push({
      id: "top-performer",
      title: "ค่าสูงสุด",
      description: `${topName} ทำได้ ${formatNumber(Number(top[numericKey]))} สูงที่สุดในมุมมองนี้`,
      severity: "success",
    });
    if (low && lowName !== topName) {
      insights.push({
        id: "lowest-performer",
        title: "จุดที่ควรติดตาม",
        description: `${lowName} อยู่ที่ ${formatNumber(Number(low[numericKey]))} ควรใช้ filter เพื่อเจาะสาเหตุ`,
        severity: "warning",
      });
    }
  }

  if (data.filteredRows.length !== data.metadata.rowCount) {
    insights.push({
      id: "filtered",
      title: "มีการกรองข้อมูล",
      description: `กำลังแสดง ${formatNumber(data.filteredRows.length)} จาก ${formatNumber(data.metadata.rowCount)} แถว`,
      severity: "info",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "ready",
      title: "พร้อมนำเสนอ",
      description: `${config.settings.general.title || "กราฟนี้"} พร้อมสำหรับปรับ theme, export และ share ในเดโม`,
      severity: "info",
    });
  }

  return insights.slice(0, 3);
}
