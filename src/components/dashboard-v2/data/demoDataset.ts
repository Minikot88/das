import type { Aggregation, DataField, FieldType, SemanticType } from "@/components/dashboard-v2/types";

export type DemoDatasetRow = Record<string, string | number | boolean>;

export type DemoDatasource = {
  id: string;
  name: string;
  database: string;
  schema: string;
  table: string;
  rowCount: number;
  fieldCount: number;
  lastUpdated: string;
};

function field(
  id: string,
  label: string,
  type: FieldType,
  semanticType: SemanticType,
  description: string,
  sampleValues: Array<string | number | boolean>,
  isMeasure: boolean,
  defaultAggregation: Aggregation
): DataField {
  return {
    id,
    name: label,
    label,
    type,
    semanticType,
    table: "sales_performance",
    description,
    sampleValues,
    isMeasure,
    isDimension: !isMeasure,
    defaultAggregation,
  };
}

export const demoDataFields: DataField[] = [
  field("date", "วันที่", "date", "date", "วันที่ของรายการ", ["2025-01-15", "2026-12-15"], false, "None"),
  field("month", "เดือน", "text", "month", "ชื่อเดือนสำหรับวิเคราะห์แนวโน้ม", ["ม.ค.", "ก.พ.", "มี.ค."], false, "None"),
  field("monthNumber", "เลขเดือน", "number", "month", "ลำดับเดือน 1-12", [1, 2, 3], false, "None"),
  field("quarter", "ไตรมาส", "text", "quarter", "ไตรมาสของยอดขาย", ["Q1", "Q2"], false, "None"),
  field("year", "ปี", "number", "year", "ปีของรายการ", [2025, 2026], false, "None"),
  field("category", "หมวดหมู่", "text", "category", "กลุ่มสินค้า", ["เทคโนโลยี", "บริการ"], false, "None"),
  field("product", "สินค้า", "text", "product", "ชื่อสินค้า", ["โน้ตบุ๊ก", "ติดตั้ง"], false, "None"),
  field("province", "จังหวัด", "geography", "location", "จังหวัดของลูกค้า", ["กรุงเทพฯ", "เชียงใหม่"], false, "None"),
  field("region", "ภูมิภาค", "geography", "location", "ภูมิภาคของลูกค้า", ["กลาง", "เหนือ"], false, "None"),
  field("channel", "ช่องทาง", "text", "channel", "ช่องทางการขาย", ["ออนไลน์", "องค์กร"], false, "None"),
  field("sales", "ยอดขาย", "currency", "currency", "มูลค่ายอดขายรวม", [520000, 890000], true, "Sum"),
  field("profit", "กำไร", "currency", "currency", "กำไรสุทธิหลังต้นทุน", [210000, 360000], true, "Sum"),
  field("cost", "ต้นทุน", "currency", "currency", "ต้นทุนสินค้าและบริการ", [300000, 520000], true, "Sum"),
  field("quantity", "จำนวน", "number", "quantity", "จำนวนหน่วยที่ขาย", [80, 140], true, "Sum"),
  field("discount", "ส่วนลด", "percentage", "percentage", "อัตราส่วนลดเฉลี่ย", [0.04, 0.12], true, "Average"),
  field("target", "เป้าหมาย", "currency", "currency", "เป้าหมายยอดขาย", [650000, 900000], true, "Sum"),
  field("customerCount", "จำนวนลูกค้า", "number", "quantity", "จำนวนลูกค้าที่ซื้อ", [24, 85], true, "Sum"),
  field("conversionRate", "อัตราแปลง", "percentage", "percentage", "อัตราแปลงจากโอกาสเป็นยอดขาย", [0.18, 0.36], true, "Average"),
  field("satisfactionScore", "คะแนนพึงพอใจ", "number", "score", "คะแนนความพึงพอใจเฉลี่ย", [3.8, 4.7], true, "Average"),
  field("open", "Open", "currency", "ohlc", "ราคาเปิดสำหรับ candlestick", [110, 132], true, "Average"),
  field("high", "High", "currency", "ohlc", "ราคาสูงสุดสำหรับ candlestick", [142, 171], true, "Average"),
  field("low", "Low", "currency", "ohlc", "ราคาต่ำสุดสำหรับ candlestick", [96, 118], true, "Average"),
  field("close", "Close", "currency", "ohlc", "ราคาปิดสำหรับ candlestick", [126, 154], true, "Average"),
  field("source", "Source", "text", "flow", "ต้นทางของ flow", ["Lead", "Quote"], false, "None"),
  field("targetNode", "Target", "text", "flow", "ปลายทางของ flow", ["Quote", "Won"], false, "None"),
  field("flowValue", "Flow Value", "number", "flow", "น้ำหนักของ flow", [120, 420], true, "Sum"),
  field("salesperson", "พนักงานขาย", "text", "category", "เจ้าของรายการขาย", ["อนันต์", "มณี"], false, "None"),
  field("isTarget", "ถึงเป้า", "boolean", "boolean", "สถานะยอดขายถึงเป้าหมาย", [true, false], false, "Count"),
];

const months = [
  { label: "ม.ค.", quarter: "Q1", monthNumber: 1 },
  { label: "ก.พ.", quarter: "Q1", monthNumber: 2 },
  { label: "มี.ค.", quarter: "Q1", monthNumber: 3 },
  { label: "เม.ย.", quarter: "Q2", monthNumber: 4 },
  { label: "พ.ค.", quarter: "Q2", monthNumber: 5 },
  { label: "มิ.ย.", quarter: "Q2", monthNumber: 6 },
  { label: "ก.ค.", quarter: "Q3", monthNumber: 7 },
  { label: "ส.ค.", quarter: "Q3", monthNumber: 8 },
  { label: "ก.ย.", quarter: "Q3", monthNumber: 9 },
  { label: "ต.ค.", quarter: "Q4", monthNumber: 10 },
  { label: "พ.ย.", quarter: "Q4", monthNumber: 11 },
  { label: "ธ.ค.", quarter: "Q4", monthNumber: 12 },
];

const years = [2025, 2026];
const categories = [
  { name: "อุปกรณ์สำนักงาน", products: ["โต๊ะทำงาน", "เก้าอี้", "ชั้นวาง"], multiplier: 1 },
  { name: "เทคโนโลยี", products: ["โน้ตบุ๊ก", "จอมอนิเตอร์", "แท็บเล็ต"], multiplier: 1.35 },
  { name: "บริการ", products: ["ติดตั้ง", "บำรุงรักษา", "อบรม"], multiplier: 0.85 },
];
const channels = [
  { name: "ออนไลน์", multiplier: 1.16 },
  { name: "หน้าร้าน", multiplier: 0.94 },
  { name: "องค์กร", multiplier: 1.28 },
  { name: "พาร์ทเนอร์", multiplier: 0.82 },
];
const provinces = [
  { name: "กรุงเทพฯ", region: "กลาง" },
  { name: "เชียงใหม่", region: "เหนือ" },
  { name: "ขอนแก่น", region: "อีสาน" },
  { name: "ชลบุรี", region: "ตะวันออก" },
  { name: "ภูเก็ต", region: "ใต้" },
  { name: "สงขลา", region: "ใต้" },
];
const segments = ["SMB", "Enterprise", "Government", "Retail"];
const salespeople = ["อนันต์", "มณี", "ศิริพร", "กิตติ", "นภา", "ธนา"];
const flowPairs = [
  ["Lead", "Qualified"],
  ["Qualified", "Proposal"],
  ["Proposal", "Negotiation"],
  ["Negotiation", "Won"],
  ["Won", "Renewal"],
  ["Lead", "Lost"],
];

function createDemoRows(): DemoDatasetRow[] {
  const rows: DemoDatasetRow[] = [];

  years.forEach((year, yearIndex) => {
    months.forEach((month, monthIndex) => {
      categories.forEach((category, categoryIndex) => {
        channels.forEach((channel, channelIndex) => {
          const sequence = yearIndex * 144 + monthIndex * 12 + categoryIndex * 4 + channelIndex;
          const base = 410000 + yearIndex * 74000 + monthIndex * 28500 + categoryIndex * 52000 + channelIndex * 27500;
          const seasonal = 1 + ((monthIndex % 4) * 0.055);
          const sales = Math.round(base * category.multiplier * channel.multiplier * seasonal);
          const target = Math.round((610000 + yearIndex * 56000 + categoryIndex * 80000 + channelIndex * 42000 + monthIndex * 16000) * category.multiplier);
          const discount = Number((0.035 + channelIndex * 0.012 + categoryIndex * 0.006 + (monthIndex % 3) * 0.004).toFixed(3));
          const costRatio = 0.58 + categoryIndex * 0.035 - channelIndex * 0.012 - discount * 0.12;
          const cost = Math.round(sales * costRatio);
          const profit = sales - cost;
          const quantity = Math.round(sales / (4200 + categoryIndex * 850 + channelIndex * 320));
          const customerCount = Math.round(quantity * (0.32 + channelIndex * 0.05 + categoryIndex * 0.03));
          const conversionRate = Number((0.16 + channelIndex * 0.035 + categoryIndex * 0.018 + (monthIndex % 4) * 0.01).toFixed(3));
          const satisfactionScore = Number((3.72 + categoryIndex * 0.16 + channelIndex * 0.08 + (monthIndex % 5) * 0.045).toFixed(2));
          const product = category.products[(monthIndex + channelIndex + yearIndex) % category.products.length];
          const province = provinces[(monthIndex + categoryIndex + channelIndex + yearIndex) % provinces.length];
          const open = Number((100 + yearIndex * 14 + monthIndex * 1.8 + categoryIndex * 8 + channelIndex * 2.5).toFixed(2));
          const close = Number((open + ((monthIndex % 5) - 1.8) * 3 + categoryIndex * 1.5 - channelIndex * 0.7).toFixed(2));
          const high = Number((Math.max(open, close) + 8 + (sequence % 6)).toFixed(2));
          const low = Number((Math.min(open, close) - 7 - (sequence % 5)).toFixed(2));
          const [source, targetNode] = flowPairs[sequence % flowPairs.length];

          rows.push({
            date: `${year}-${String(month.monthNumber).padStart(2, "0")}-${String(8 + channelIndex * 4).padStart(2, "0")}`,
            month: month.label,
            monthNumber: month.monthNumber,
            quarter: month.quarter,
            year,
            category: category.name,
            product,
            province: province.name,
            region: province.region,
            channel: channel.name,
            sales,
            profit,
            cost,
            quantity,
            discount,
            target,
            customerCount,
            conversionRate,
            satisfactionScore,
            open,
            high,
            low,
            close,
            source,
            targetNode,
            flowValue: Math.round(customerCount * (1.6 + categoryIndex * 0.28 + channelIndex * 0.12)),
            customerSegment: segments[(categoryIndex + channelIndex + yearIndex) % segments.length],
            salesperson: salespeople[(monthIndex + categoryIndex + channelIndex + yearIndex) % salespeople.length],
            isTarget: sales >= target,
          });
        });
      });
    });
  });

  return rows;
}

export const demoRows = createDemoRows();

export const demoDatasources: DemoDatasource[] = [
  {
    id: "researchdb",
    name: "researchdb",
    database: "researchdb",
    schema: "sales",
    table: "sales_performance",
    rowCount: demoRows.length,
    fieldCount: demoDataFields.length,
    lastUpdated: "3 นาทีที่แล้ว",
  },
  {
    id: "sales_mart",
    name: "sales mart",
    database: "sales_mart",
    schema: "analytics",
    table: "sales_performance",
    rowCount: demoRows.length,
    fieldCount: demoDataFields.length,
    lastUpdated: "12 นาทีที่แล้ว",
  },
];

export function getFieldById(fieldId: string) {
  return demoDataFields.find((fieldItem) => fieldItem.id === fieldId);
}

export function getDistinctFieldValues(rows: DemoDatasetRow[], fieldId: string) {
  return Array.from(new Set(rows.map((row) => String(row[fieldId])))).sort((a, b) => a.localeCompare(b, "th"));
}
