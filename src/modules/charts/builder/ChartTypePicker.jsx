import React, { useEffect, useMemo, useState } from "react";

const TEMPLATE_ICONS = {
  bar: "BAR",
  line: "LIN",
  area: "ARE",
  pie: "PIE",
  doughnut: "DON",
  donut: "DON",
  scatter: "SCT",
  bubble: "BUB",
  table: "TBL",
  kpi: "KPI",
  heatmap: "HEA",
  radar: "RAD",
  mixed: "MIX",
};

const FAMILY_LABELS = {
  bar: "แท่ง",
  line: "เส้น",
  area: "พื้นที่",
  pie: "วงกลม",
  doughnut: "โดนัท",
  donut: "โดนัท",
  scatter: "กระจาย",
  bubble: "บับเบิล",
  table: "ตาราง",
  kpi: "ตัวชี้วัด",
  heatmap: "ฮีตแมป",
  radar: "เรดาร์",
  mixed: "ผสม",
  "polar-area": "โพลา",
};

const TEMPLATE_LABELS = {
  "bar-vertical": ["กราฟแท่งแนวตั้ง", "เปรียบเทียบค่าตัวเลขตามหมวดหมู่"],
  "bar-horizontal": ["กราฟแท่งแนวนอน", "จัดอันดับหมวดหมู่ด้วยแท่งแนวนอน"],
  "bar-stacked": ["กราฟแท่งซ้อน", "ดูสัดส่วนย่อยภายในแต่ละหมวดหมู่"],
  "bar-grouped": ["กราฟแท่งแบบกลุ่ม", "เปรียบเทียบหลายชุดข้อมูลในหมวดหมู่เดียวกัน"],
  "bar-floating": ["กราฟแท่งช่วงค่า", "แสดงช่วงเริ่มต้นและสิ้นสุดของค่า"],
  "line-basic": ["กราฟเส้น", "ติดตามแนวโน้มตามเวลา"],
  "line-multi": ["กราฟเส้นหลายชุด", "เปรียบเทียบแนวโน้มหลายชุดข้อมูล"],
  "line-stepped": ["กราฟเส้นขั้นบันได", "แสดงการเปลี่ยนแปลงเป็นช่วงระดับ"],
  "line-curved": ["กราฟเส้นโค้ง", "นำเสนอแนวโน้มด้วยเส้นที่นุ่มขึ้น"],
  "line-multi-axis": ["กราฟเส้นหลายแกน", "เทียบค่าหลายมาตรวัดในมุมมองเดียว"],
  "area-basic": ["กราฟพื้นที่", "เน้นปริมาณสะสมตามช่วงเวลา"],
  "area-stacked": ["กราฟพื้นที่ซ้อน", "แสดงองค์ประกอบที่รวมกันเป็นผลรวม"],
  "area-filled-line": ["กราฟเส้นพร้อมพื้นที่", "เน้นแนวโน้มพร้อมพื้นหลังเชิงปริมาณ"],
  "pie-basic": ["กราฟวงกลม", "แสดงสัดส่วนของหมวดหมู่"],
  "doughnut-basic": ["กราฟโดนัท", "แสดงสัดส่วนพร้อมพื้นที่กลางกราฟ"],
  "doughnut-semi": ["กราฟโดนัทครึ่งวง", "นำเสนอสัดส่วนแบบประหยัดพื้นที่"],
  "doughnut-multi-ring": ["กราฟโดนัทหลายวง", "เปรียบเทียบสัดส่วนหลายระดับ"],
  "polar-area-basic": ["กราฟโพลา", "เทียบหมวดหมู่ด้วยพื้นที่รัศมี"],
  "radar-basic": ["กราฟเรดาร์", "เปรียบเทียบหลายมิติในภาพเดียว"],
  "radar-filled": ["กราฟเรดาร์เติมสี", "เน้นพื้นที่รวมของหลายมิติ"],
  "radar-multi-dataset": ["กราฟเรดาร์หลายชุด", "เทียบหลายชุดข้อมูลบนแกนเดียวกัน"],
  "scatter-basic": ["กราฟกระจาย", "ดูความสัมพันธ์ระหว่างสองตัวแปร"],
  "scatter-multi-series": ["กราฟกระจายหลายชุด", "เปรียบเทียบกลุ่มข้อมูลหลายชุด"],
  "bubble-basic": ["กราฟบับเบิล", "เพิ่มขนาดจุดเพื่อสื่อค่าที่สาม"],
  "bubble-size-comparison": ["กราฟบับเบิลเปรียบเทียบ", "เปรียบเทียบความสัมพันธ์และขนาดพร้อมกัน"],
  "mixed-bar-line": ["กราฟแท่งและเส้น", "ผสมปริมาณกับแนวโน้มในมุมมองเดียว"],
  "mixed-stacked-bar-line": ["กราฟแท่งซ้อนและเส้น", "ผสมองค์ประกอบย่อยกับแนวโน้มหลัก"],
  "mixed-multi-axis": ["กราฟผสมหลายแกน", "วิเคราะห์หลายมาตรวัดในพื้นที่เดียว"],
};

function getTemplateIcon(template) {
  const tokens = [template?.family, template?.variant, template?.id, template?.name]
    .filter(Boolean)
    .map((token) => String(token).toLowerCase());
  const matchedKey = Object.keys(TEMPLATE_ICONS).find((key) => tokens.some((token) => token.includes(key)));
  return TEMPLATE_ICONS[matchedKey] ?? "CHT";
}

function getTemplateLabel(template) {
  const extendedLabels = {
    "table-basic": ["ตารางข้อมูล", "แสดงระเบียนและคอลัมน์สำคัญแบบอ่านง่าย"],
    "kpi-basic": ["ตัวชี้วัด", "สรุปตัวเลขหลักสำหรับผู้บริหารพร้อมบริบทเปรียบเทียบ"],
    "heatmap-basic": ["ฮีตแมป", "เปรียบเทียบความเข้มข้นของค่าข้ามแถวและคอลัมน์"],
  };
  const extendedLabel = extendedLabels[template?.id];
  if (extendedLabel) return { name: extendedLabel[0], description: extendedLabel[1] };

  const label = TEMPLATE_LABELS[template?.id];
  if (label) return { name: label[0], description: label[1] };

  const familyLabel = FAMILY_LABELS[template?.family] ?? "กราฟ";
  return {
    name: `กราฟ${familyLabel}`,
    description: "เลือกรูปแบบนี้เพื่อสร้างภาพข้อมูลจากชุดข้อมูลที่เลือก",
  };
}

export default function ChartTypePicker({ templates = [], selectedTemplateId, onChange }) {
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const [activeFamily, setActiveFamily] = useState(selectedTemplate?.family ?? "bar");

  useEffect(() => {
    if (selectedTemplate?.family) {
      setActiveFamily(selectedTemplate.family);
    }
  }, [selectedTemplate?.family]);

  const families = useMemo(
    () => Array.from(new Set(templates.map((template) => template.family))),
    [templates]
  );
  const visibleTemplates = templates.filter((template) => template.family === activeFamily);

  return (
    <section className="builder-v3-panel builder-v3-chart-picker-panel">
      <div className="builder-v3-section-head">
        <div>
          <span className="builder-v3-kicker">ประเภทกราฟ</span>
          <h2 className="builder-v3-title">เลือกรูปแบบ</h2>
        </div>
      </div>

      <div className="builder-v3-family-tabs">
        {families.map((family) => (
          <button
            key={family}
            type="button"
            className={`builder-v3-family-tab${family === activeFamily ? " is-active" : ""}`}
            onClick={() => setActiveFamily(family)}
          >
            {FAMILY_LABELS[family] ?? family}
          </button>
        ))}
      </div>

      <div className="builder-v3-template-grid">
        {visibleTemplates.map((template) => {
          const templateLabel = getTemplateLabel(template);
          return (
            <button
              key={template.id}
              type="button"
              className={`builder-v3-template-card${template.id === selectedTemplateId ? " is-active" : ""}`}
              onClick={() => onChange(template.id)}
            >
              <span
                className={`builder-v3-template-thumb is-${template.family}`}
                data-token={getTemplateIcon(template)}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="builder-v3-template-copy">
                <strong>{templateLabel.name}</strong>
                <span>{templateLabel.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
