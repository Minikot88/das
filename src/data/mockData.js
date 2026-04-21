export const TYPE_BADGE = {
  string: "STR",
  number: "NUM",
  date: "DATE",
  boolean: "BOOL",
};

export const TYPE_COLOR = {
  string: "#52c41a",
  number: "#1677ff",
  date: "#fa8c16",
  boolean: "#722ed1",
};

function createField(name, type, role = []) {
  return { name, type, role };
}

function toLabel(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const salesFields = [
  createField("month", "string", ["time", "category"]),
  createField("category", "string", ["category", "series"]),
  createField("sales", "number", ["value"]),
  createField("profit", "number", ["value"]),
];

const salesRows = [
  { month: "Jan", category: "Technology", sales: 120000, profit: 26000 },
  { month: "Feb", category: "Technology", sales: 138000, profit: 32000 },
  { month: "Mar", category: "Technology", sales: 149000, profit: 35000 },
  { month: "Apr", category: "Technology", sales: 143000, profit: 31000 },
  { month: "Jan", category: "Furniture", sales: 82000, profit: 14000 },
  { month: "Feb", category: "Furniture", sales: 91000, profit: 17000 },
  { month: "Mar", category: "Furniture", sales: 98000, profit: 19500 },
  { month: "Apr", category: "Furniture", sales: 104000, profit: 21000 },
];

const financeFields = [
  createField("quarter", "string", ["time", "category"]),
  createField("revenue", "number", ["value"]),
  createField("expense", "number", ["value"]),
];

const financeRows = [
  { quarter: "Q1 2024", revenue: 420000, expense: 290000 },
  { quarter: "Q2 2024", revenue: 465000, expense: 305000 },
  { quarter: "Q3 2024", revenue: 488000, expense: 319000 },
  { quarter: "Q4 2024", revenue: 530000, expense: 344000 },
  { quarter: "Q1 2025", revenue: 548000, expense: 356000 },
  { quarter: "Q2 2025", revenue: 582000, expense: 371000 },
];

const geoFields = [
  createField("country", "string", ["geo", "category"]),
  createField("value", "number", ["value"]),
];

const geoRows = [
  { country: "United States", value: 185000 },
  { country: "Canada", value: 92000 },
  { country: "Germany", value: 110000 },
  { country: "Japan", value: 98000 },
  { country: "Australia", value: 76000 },
  { country: "Brazil", value: 69000 },
];

const scatterFields = [
  createField("x", "number", ["value"]),
  createField("y", "number", ["value"]),
  createField("group", "string", ["category", "series"]),
  createField("size", "number", ["value"]),
];

const scatterRows = [
  { x: 12, y: 18, group: "Core", size: 10 },
  { x: 18, y: 26, group: "Core", size: 12 },
  { x: 24, y: 31, group: "Growth", size: 16 },
  { x: 29, y: 35, group: "Growth", size: 18 },
  { x: 34, y: 22, group: "Legacy", size: 11 },
  { x: 39, y: 29, group: "Legacy", size: 13 },
  { x: 45, y: 42, group: "Emerging", size: 19 },
  { x: 52, y: 48, group: "Emerging", size: 22 },
];

const hierarchyFields = [
  createField("level1", "string", ["hierarchy", "category", "series"]),
  createField("level2", "string", ["hierarchy", "category"]),
  createField("label", "string", ["hierarchy", "category", "series"]),
  createField("value", "number", ["value"]),
];

const hierarchyRows = [
  { level1: "Technology", level2: "Laptops", label: "ApexBook Pro", value: 120 },
  { level1: "Technology", level2: "Laptops", label: "Nimbus Air", value: 95 },
  { level1: "Technology", level2: "Accessories", label: "Pulse Mouse", value: 74 },
  { level1: "Technology", level2: "Accessories", label: "Vector Keyboard", value: 68 },
  { level1: "Furniture", level2: "Chairs", label: "Ergo Chair", value: 88 },
  { level1: "Furniture", level2: "Chairs", label: "Summit Task Chair", value: 79 },
  { level1: "Furniture", level2: "Desks", label: "Lift Desk 120", value: 101 },
  { level1: "Furniture", level2: "Desks", label: "Studio Table", value: 84 },
];

const calendarFields = [
  createField("date", "date", ["time"]),
  createField("value", "number", ["value"]),
];

const calendarRows = [
  { date: "2024-01-01", value: 42 },
  { date: "2024-01-02", value: 38 },
  { date: "2024-01-03", value: 45 },
  { date: "2024-01-04", value: 51 },
  { date: "2024-01-05", value: 47 },
  { date: "2024-01-06", value: 36 },
  { date: "2024-01-07", value: 33 },
  { date: "2024-01-08", value: 49 },
];

export const schema = {
  business: {
    sales: { fields: salesFields, data: salesRows },
    finance: { fields: financeFields, data: financeRows },
    geo_data: { fields: geoFields, data: geoRows },
    scatter_data: { fields: scatterFields, data: scatterRows },
    hierarchy_data: { fields: hierarchyFields, data: hierarchyRows },
    calendar_data: { fields: calendarFields, data: calendarRows },
  },
};

export const datasets = Object.fromEntries(
  Object.values(schema).flatMap((database) =>
    Object.entries(database).map(([tableName, table]) => [tableName, table.data])
  )
);

export const datasetSummaries = Object.fromEntries(
  Object.entries(datasets).map(([name, rows]) => [
    name,
    {
      label: toLabel(name),
      rowCount: rows.length,
    },
  ])
);
