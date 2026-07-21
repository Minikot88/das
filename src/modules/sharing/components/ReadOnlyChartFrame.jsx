import React from "react";
import ChartRenderer from "@/components/charts/ChartRenderer";

const CHART_TYPE_LABELS = {
  line: "เส้น",
  area: "พื้นที่",
  bar: "แท่ง",
  "stacked-bar": "แท่งซ้อน",
  "grouped-bar": "แท่งกลุ่ม",
  pie: "วงกลม",
  doughnut: "โดนัท",
  donut: "โดนัท",
  scatter: "กระจาย",
  bubble: "บับเบิล",
  heatmap: "ฮีตแมป",
  histogram: "ฮิสโตแกรม",
  radar: "เรดาร์",
  gauge: "เกจ",
  funnel: "ฟันเนล",
  table: "ตาราง",
  kpi: "ตัวชี้วัด",
};

export default function ReadOnlyChartFrame({ chart }) {
  const chartType = chart.type ?? chart.config?.type;
  const chartLabel = CHART_TYPE_LABELS[chartType] ?? chartType ?? "กราฟ";
  const xField = chart.mapping?.x || chart.mapping?.label || "ยังไม่ตั้งค่า";
  const yField = chart.mapping?.y || chart.mapping?.value || chart.mapping?.bar || "ยังไม่ตั้งค่า";
  const groupField = chart.mapping?.series || "ไม่มี";
  const dataset = chart.dataset || "ไม่พร้อมใช้งาน";

  return (
    <article className="readonly-chart-frame" aria-label={`กราฟที่แชร์: ${chart.title}`} role="listitem">
      <div className="readonly-chart-header">
        <div className="readonly-chart-title-row">
          <h2 className="readonly-chart-title">{chart.title}</h2>
          <div className="readonly-chart-tags" aria-label="รายละเอียดกราฟ">
            <span className="chart-type-badge">{chartLabel}</span>
            <span className="readonly-chart-tag">อ่านอย่างเดียว</span>
          </div>
        </div>
        <div className="readonly-chart-meta">
          <span>ชุดข้อมูล: <strong>{dataset}</strong></span>
          <span>X: <strong>{xField}</strong></span>
          <span>Y: <strong>{yField}</strong></span>
          <span>กลุ่ม: <strong>{groupField}</strong></span>
        </div>
      </div>
      <div className="readonly-chart-body">
        <ChartRenderer chart={chart} containerHeight={320} mode="readonly" />
      </div>
    </article>
  );
}
