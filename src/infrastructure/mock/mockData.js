const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const REGIONS = ["North", "South", "East", "West"];
const CATEGORIES = ["Technology", "Furniture", "Office Supplies"];
const PRODUCTS = {
  Technology: ["Laptop", "Monitor", "Keyboard"],
  Furniture: ["Desk", "Chair", "Cabinet"],
  "Office Supplies": ["Notebook", "Pen Set", "Binder"],
};
const CHANNELS = ["Online", "Retail"];
const SEGMENTS = ["Enterprise", "SMB"];

export const TYPE_BADGE = {
  string: "STR",
  number: "NUM",
  date: "DATE",
  boolean: "BOOL",
};

export const TYPE_COLOR = {
  string: "#64748b",
  number: "#2563eb",
  date: "#0f766e",
  boolean: "#7c3aed",
};

function createField(name, label, type, semanticType = type) {
  return {
    name,
    label,
    type,
    semanticType,
  };
}

function getQuarter(monthIndex) {
  return `Q${Math.floor(monthIndex / 3) + 1}`;
}

function createMockRow(monthIndex, regionIndex, categoryIndex) {
  const category = CATEGORIES[categoryIndex];
  const productOptions = PRODUCTS[category];
  const product = productOptions[(monthIndex + regionIndex) % productOptions.length];
  const channel = CHANNELS[(monthIndex + categoryIndex) % CHANNELS.length];
  const segment = SEGMENTS[(regionIndex + categoryIndex) % SEGMENTS.length];
  const date = new Date(Date.UTC(2025, monthIndex, 1));
  const month = MONTH_NAMES[monthIndex];
  const base = 920 + (monthIndex * 62) + (regionIndex * 88) + (categoryIndex * 96);
  const quantity = 28 + (monthIndex % 4) * 4 + regionIndex * 3 + categoryIndex * 5;
  const orders = 18 + monthIndex + regionIndex * 4 + categoryIndex * 3;
  const discount = Number((0.04 + categoryIndex * 0.015 + (monthIndex % 3) * 0.01).toFixed(2));
  const rating = Number((3.6 + regionIndex * 0.18 + categoryIndex * 0.11 + (monthIndex % 5) * 0.05).toFixed(1));
  const sales = Math.round(base * quantity * (1 + discount));
  const cost = Math.round(sales * (0.58 + categoryIndex * 0.05));
  const profit = sales - cost;
  const target = Math.round(sales * (1.08 + (regionIndex % 2) * 0.04));
  const minRange = Math.round(sales * 0.72);
  const maxRange = Math.round(sales * 1.18);

  return {
    date: date.toISOString().slice(0, 10),
    month,
    quarter: getQuarter(monthIndex),
    year: date.getUTCFullYear(),
    region: REGIONS[regionIndex],
    category,
    product,
    channel,
    segment,
    sales,
    profit,
    orders,
    quantity,
    discount,
    target,
    cost,
    rating,
    minRange,
    maxRange,
  };
}

export const mockRows = Array.from({ length: 12 }).flatMap((_, monthIndex) =>
  REGIONS.flatMap((_, regionIndex) =>
    CATEGORIES.map((__, categoryIndex) => createMockRow(monthIndex, regionIndex, categoryIndex))
  )
);

export const mockFields = [
  createField("date", "วันที่", "date", "date"),
  createField("month", "เดือน", "string", "category"),
  createField("quarter", "ไตรมาส", "string", "category"),
  createField("year", "ปี", "number", "number"),
  createField("region", "ภูมิภาค", "string", "category"),
  createField("category", "หมวดหมู่", "string", "category"),
  createField("product", "สินค้า", "string", "category"),
  createField("channel", "ช่องทาง", "string", "category"),
  createField("segment", "กลุ่มลูกค้า", "string", "category"),
  createField("sales", "ยอดขาย", "number", "number"),
  createField("profit", "กำไร", "number", "number"),
  createField("orders", "คำสั่งซื้อ", "number", "number"),
  createField("quantity", "จำนวน", "number", "number"),
  createField("discount", "ส่วนลด", "number", "number"),
  createField("target", "เป้าหมาย", "number", "number"),
  createField("cost", "ต้นทุน", "number", "number"),
  createField("rating", "คะแนน", "number", "number"),
  createField("minRange", "ช่วงต่ำสุด", "number", "number"),
  createField("maxRange", "ช่วงสูงสุด", "number", "number"),
];

export const mockDataset = {
  id: "sales_performance",
  name: "ประสิทธิภาพการขาย",
  fields: mockFields,
  rows: mockRows,
};

export const datasets = {
  [mockDataset.id]: mockRows,
};

export const schema = {
  business: {
    [mockDataset.id]: {
      fields: mockFields,
      data: mockRows,
    },
  },
};

export const datasetSummaries = {
  [mockDataset.id]: {
    label: mockDataset.name,
    rowCount: mockRows.length,
  },
};

export const mockData = mockDataset;
