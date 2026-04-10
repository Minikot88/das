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

function createRng(seed = 1) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function createField(name, type, role = []) {
  return { name, type, role };
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const categoryCatalog = [
  {
    category: "Technology",
    subCategories: [
      { sub_category: "Laptops", products: ["ApexBook Pro 14", "Nimbus Air 13", "Vertex Studio 15", "Orbit Lite 12"] },
      { sub_category: "Accessories", products: ["Pulse Mouse", "Vector Keyboard", "Dock Hub X", "CloudCam 4K"] },
      { sub_category: "Networking", products: ["Mesh Router X", "Signal Switch 24", "Edge Firewall S", "Stream Access Point"] },
    ],
  },
  {
    category: "Office Supplies",
    subCategories: [
      { sub_category: "Paper", products: ["Prime Copy A4", "Eco Notebook", "Ledger Pad", "Sketch Roll"] },
      { sub_category: "Storage", products: ["Archive Box", "Flex Binder", "Clip Folder", "Label Case"] },
      { sub_category: "Writing", products: ["InkFlow Pen", "Marker Set Pro", "Draft Pencil", "Studio Highlighter"] },
    ],
  },
  {
    category: "Furniture",
    subCategories: [
      { sub_category: "Chairs", products: ["Ergo Chair Plus", "Flex Stool", "Summit Task Chair", "Lounge Seat One"] },
      { sub_category: "Desks", products: ["Lift Desk 120", "Studio Table", "Corner Desk Max", "Focus Bench"] },
      { sub_category: "Storage Furniture", products: ["Cube Shelf 6", "Metal Cabinet", "Mobile Pedestal", "Open Rack 4"] },
    ],
  },
];

const productCatalog = categoryCatalog.flatMap((group) =>
  group.subCategories.flatMap((subGroup, subIndex) =>
    subGroup.products.map((product, productIndex) => ({
      product,
      category: group.category,
      sub_category: subGroup.sub_category,
      basePrice:
        group.category === "Technology"
          ? 120 + subIndex * 140 + productIndex * 55
          : group.category === "Furniture"
            ? 90 + subIndex * 110 + productIndex * 45
            : 12 + subIndex * 14 + productIndex * 6,
      baseDemand:
        group.category === "Technology"
          ? 22 - subIndex * 2 + productIndex
          : group.category === "Furniture"
            ? 14 - subIndex + productIndex
            : 40 - subIndex * 3 + productIndex * 2,
    }))
  )
);

const regionalCatalog = [
  { region: "North America", countries: ["United States", "Canada", "Mexico"] },
  { region: "Europe", countries: ["Germany", "United Kingdom", "France", "Netherlands"] },
  { region: "Asia Pacific", countries: ["Japan", "Singapore", "Australia", "India"] },
  { region: "Latin America", countries: ["Brazil", "Chile", "Colombia"] },
];

const segments = ["Consumer", "Corporate", "Small Business", "Enterprise"];
const channels = ["online", "offline"];
const departments = ["Marketing", "Sales", "Operations", "Engineering", "Support", "Finance"];
const costCenters = ["CC-101", "CC-205", "CC-310", "CC-415", "CC-520", "CC-625"];
const userCountries = ["United States", "India", "United Kingdom", "Germany", "Brazil", "Japan"];
const platforms = ["web", "mobile"];
const subjectAreas = ["AI", "Sustainability", "Healthcare", "Supply Chain", "Finance"];
const researchTitles = [
  "Adaptive Forecasting for Retail Demand",
  "Efficient Vision Models for Edge Devices",
  "Trustworthy LLM Evaluation in Practice",
  "Carbon-Aware Cloud Scheduling",
  "Digital Twins for Smart Manufacturing",
  "Responsible Recommendation Systems",
  "Clinical NLP for Decision Support",
  "Graph Learning for Fraud Detection",
  "Optimization in Urban Logistics",
  "Human-Centered Analytics Dashboards",
  "Privacy-Preserving Customer Intelligence",
  "Real-Time Risk Scoring with Streams",
];

const salesRng = createRng(101);
const financeRng = createRng(202);
const usersRng = createRng(303);
const researchRng = createRng(404);
const scatterRng = createRng(505);
const calendarRng = createRng(606);

function generateSalesRows() {
  const rows = [];
  const startDate = new Date("2024-01-01T00:00:00.000Z");
  let orderCounter = 10001;
  let customerCounter = 7001;

  for (let weekIndex = 0; weekIndex < 26; weekIndex += 1) {
    const date = addDays(startDate, weekIndex * 7);
    const month = date.getUTCMonth() + 1;
    const seasonalLift = [0.92, 0.95, 0.98, 1.01, 1.04, 1.08, 1.06, 1.03, 1.07, 1.12, 1.18, 1.24][month - 1];

    productCatalog.forEach((item, productIndex) => {
      const regionInfo = regionalCatalog[(weekIndex + productIndex) % regionalCatalog.length];
      const country = regionInfo.countries[(productIndex + weekIndex * 2) % regionInfo.countries.length];
      const segment = segments[(weekIndex + productIndex * 2) % segments.length];
      const channel = channels[(weekIndex + productIndex) % channels.length];
      const segmentLift = segment === "Enterprise" ? 1.32 : segment === "Corporate" ? 1.18 : segment === "Small Business" ? 1.08 : 0.96;
      const channelLift = channel === "online" ? 1.05 : 0.98;
      const demandNoise = 0.82 + salesRng() * 0.48;
      const quantity = Math.max(2, Math.round(item.baseDemand * demandNoise * seasonalLift * (channel === "online" ? 1.08 : 0.95)));
      const discount = round(Math.min(0.32, salesRng() * 0.26 + (segment === "Enterprise" ? 0.05 : 0)), 2);
      const unitPrice = item.basePrice * seasonalLift * segmentLift * channelLift * (0.94 + salesRng() * 0.12);
      const grossSales = unitPrice * quantity * (1 - discount);
      const operatingCost = item.basePrice * quantity * (0.62 + salesRng() * 0.22);
      const profit = grossSales - operatingCost - randomInt(salesRng, 12, 140);

      rows.push({
        date: isoDate(date),
        year: date.getUTCFullYear(),
        month,
        day: date.getUTCDate(),
        product: item.product,
        category: item.category,
        sub_category: item.sub_category,
        region: regionInfo.region,
        country,
        segment,
        channel,
        sales: round(grossSales),
        profit: round(profit),
        quantity,
        discount,
        order_id: `ORD-${orderCounter}`,
        customer_id: `CUST-${customerCounter}`,
      });

      orderCounter += 1;
      if ((productIndex + weekIndex) % 3 === 0) customerCounter += 1;
    });
  }

  return rows;
}

function generateFinanceRows() {
  const rows = [];
  const startDate = new Date("2023-01-01T00:00:00.000Z");

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const date = addMonths(startDate, monthIndex);
    const seasonality = 0.9 + ((monthIndex % 12) / 12) * 0.35;

    departments.forEach((department, departmentIndex) => {
      const revenueBase = 95000 + departmentIndex * 22000;
      const expenseBase = 62000 + departmentIndex * 18000;
      const revenue = revenueBase * seasonality * (0.92 + financeRng() * 0.22) + monthIndex * 1800;
      const expense = expenseBase * (0.9 + financeRng() * 0.2) + monthIndex * 1200;
      rows.push({
        date: isoDate(date),
        revenue: round(revenue),
        expense: round(expense),
        profit: round(revenue - expense),
        department,
        cost_center: costCenters[departmentIndex],
      });
    });
  }

  return rows;
}

function generateUserRows() {
  const rows = [];
  const startDate = new Date("2024-07-01T00:00:00.000Z");

  for (let dayIndex = 0; dayIndex < 120; dayIndex += 1) {
    const date = addDays(startDate, dayIndex);
    const weekday = date.getUTCDay();
    const weekdayLift = weekday === 0 || weekday === 6 ? 0.9 : 1.08;

    platforms.forEach((platform, platformIndex) => {
      userCountries.forEach((country, countryIndex) => {
        const countryBase = 1800 + countryIndex * 750;
        const platformLift = platform === "mobile" ? 1.18 : 0.96;
        const users = Math.round(countryBase * weekdayLift * platformLift * (0.85 + usersRng() * 0.38));
        const activeUsers = Math.min(users, Math.round(users * (0.52 + usersRng() * 0.23)));
        const newUsers = Math.max(45, Math.round(users * (0.08 + usersRng() * 0.08)));

        rows.push({
          date: isoDate(date),
          users,
          active_users: activeUsers,
          new_users: newUsers,
          platform,
          country,
        });
      });
    });
  }

  return rows;
}

function generateResearchRows() {
  const rows = [];
  const startDate = new Date("2023-01-01T00:00:00.000Z");

  for (let monthIndex = 0; monthIndex < 18; monthIndex += 1) {
    const date = addMonths(startDate, monthIndex);

    researchTitles.forEach((dcTitle, titleIndex) => {
      const subject_area = subjectAreas[titleIndex % subjectAreas.length];
      const growth = monthIndex * randomInt(researchRng, 2, 7);
      const citedby_count = 18 + titleIndex * 5 + growth + randomInt(researchRng, 0, 14);
      const download_count = 120 + titleIndex * 24 + monthIndex * 14 + randomInt(researchRng, 10, 120);

      rows.push({
        prism_coverDate: isoDate(date),
        dc_title: dcTitle,
        citedby_count,
        download_count,
        subject_area,
      });
    });
  }

  return rows;
}

function buildSankeyRows(salesRows) {
  const linkMap = new Map();

  salesRows.forEach((row) => {
    const channelToCategoryKey = `${row.channel}|||${row.category}`;
    const categoryToProductKey = `${row.category}|||${row.product}`;

    linkMap.set(channelToCategoryKey, (linkMap.get(channelToCategoryKey) ?? 0) + row.sales);
    linkMap.set(categoryToProductKey, (linkMap.get(categoryToProductKey) ?? 0) + row.sales);
  });

  return [...linkMap.entries()].map(([key, value]) => {
    const [source, target] = key.split("|||");
    return {
      source,
      target,
      value: round(value),
    };
  });
}

function buildGeoRows(salesRows) {
  const totals = new Map();

  salesRows.forEach((row) => {
    totals.set(row.country, (totals.get(row.country) ?? 0) + row.sales);
  });

  return [...totals.entries()]
    .map(([country, value]) => ({ country, value: round(value) }))
    .sort((left, right) => right.value - left.value);
}

function generateHeatmapRows() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rows = [];

  days.forEach((day, dayIndex) => {
    for (let hour = 0; hour < 24; hour += 1) {
      const businessLift = hour >= 8 && hour <= 18 ? 1.25 : 0.72;
      const weekdayLift = dayIndex < 5 ? 1.12 : 0.88;
      const wave = Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 3) + 1.2;
      const value = Math.round((40 + dayIndex * 9 + hour * 2.4) * businessLift * weekdayLift * wave);
      rows.push({ x: hour, y: day, value });
    }
  });

  return rows;
}

function generateScatterRows() {
  const categories = ["High Growth", "Core", "Emerging", "Legacy"];
  const rows = [];

  for (let index = 0; index < 240; index += 1) {
    const category = categories[index % categories.length];
    const xBase = category === "High Growth" ? 72 : category === "Core" ? 56 : category === "Emerging" ? 44 : 30;
    const yBase = category === "High Growth" ? 82 : category === "Core" ? 61 : category === "Emerging" ? 46 : 34;
    const sizeBase = category === "High Growth" ? 42 : category === "Core" ? 34 : category === "Emerging" ? 24 : 18;

    rows.push({
      x: round(xBase + scatterRng() * 18 - 9, 2),
      y: round(yBase + scatterRng() * 22 - 11, 2),
      size: round(sizeBase + scatterRng() * 18, 2),
      category,
    });
  }

  return rows;
}

function buildHierarchyRows(salesRows) {
  const totals = new Map();

  salesRows.forEach((row) => {
    const key = `${row.category}|||${row.sub_category}|||${row.product}`;
    totals.set(key, (totals.get(key) ?? 0) + row.sales);
  });

  return [...totals.entries()].map(([key, value]) => {
    const [level1, level2, level3] = key.split("|||");
    return {
      level1,
      level2,
      level3,
      value: round(value),
    };
  });
}

function generateCalendarRows() {
  const rows = [];
  const startDate = new Date("2024-01-01T00:00:00.000Z");

  for (let dayIndex = 0; dayIndex < 366; dayIndex += 1) {
    const date = addDays(startDate, dayIndex);
    const month = date.getUTCMonth() + 1;
    const weekday = date.getUTCDay();
    const seasonalLift = month >= 10 ? 1.2 : month >= 6 ? 1.05 : 0.94;
    const weekdayLift = weekday === 0 || weekday === 6 ? 0.84 : 1.08;
    const value = Math.round((120 + (dayIndex % 30) * 6 + calendarRng() * 80) * seasonalLift * weekdayLift);

    rows.push({
      date: isoDate(date),
      value,
    });
  }

  return rows;
}

const salesRows = generateSalesRows();
const financeRows = generateFinanceRows();
const userRows = generateUserRows();
const researchRows = generateResearchRows();
const sankeyRows = buildSankeyRows(salesRows);
const geoRows = buildGeoRows(salesRows);
const heatmapRows = generateHeatmapRows();
const scatterRows = generateScatterRows();
const hierarchyRows = buildHierarchyRows(salesRows);
const calendarRows = generateCalendarRows();

const salesFields = [
  createField("date", "date", ["time"]),
  createField("year", "number", ["time", "category"]),
  createField("month", "number", ["time", "category"]),
  createField("day", "number", ["time", "category"]),
  createField("product", "string", ["category", "series"]),
  createField("category", "string", ["category", "series"]),
  createField("sub_category", "string", ["category", "hierarchy"]),
  createField("region", "string", ["category", "geo"]),
  createField("country", "string", ["category", "geo"]),
  createField("segment", "string", ["category", "series"]),
  createField("channel", "string", ["category", "series", "source"]),
  createField("sales", "number", ["value"]),
  createField("profit", "number", ["value"]),
  createField("quantity", "number", ["value"]),
  createField("discount", "number", ["value"]),
  createField("order_id", "string", ["category"]),
  createField("customer_id", "string", ["category"]),
];

const financeFields = [
  createField("date", "date", ["time"]),
  createField("revenue", "number", ["value"]),
  createField("expense", "number", ["value"]),
  createField("profit", "number", ["value"]),
  createField("department", "string", ["category", "series"]),
  createField("cost_center", "string", ["category", "series"]),
];

const userFields = [
  createField("date", "date", ["time"]),
  createField("users", "number", ["value"]),
  createField("active_users", "number", ["value"]),
  createField("new_users", "number", ["value"]),
  createField("platform", "string", ["category", "series"]),
  createField("country", "string", ["category", "geo", "series"]),
];

const researchFields = [
  createField("prism_coverDate", "date", ["time"]),
  createField("dc_title", "string", ["category", "series"]),
  createField("citedby_count", "number", ["value"]),
  createField("download_count", "number", ["value"]),
  createField("subject_area", "string", ["category", "series"]),
];

const sankeyFields = [
  createField("source", "string", ["source", "category"]),
  createField("target", "string", ["target", "category"]),
  createField("value", "number", ["value"]),
];

const geoFields = [
  createField("country", "string", ["geo", "category"]),
  createField("value", "number", ["value"]),
];

const heatmapFields = [
  createField("x", "number", ["time", "category"]),
  createField("y", "string", ["category", "series"]),
  createField("value", "number", ["value"]),
];

const scatterFields = [
  createField("x", "number", ["value"]),
  createField("y", "number", ["value"]),
  createField("size", "number", ["value"]),
  createField("category", "string", ["category", "series"]),
];

const hierarchyFields = [
  createField("level1", "string", ["hierarchy", "category"]),
  createField("level2", "string", ["hierarchy", "category"]),
  createField("level3", "string", ["hierarchy", "category"]),
  createField("value", "number", ["value"]),
];

const calendarFields = [
  createField("date", "date", ["time"]),
  createField("value", "number", ["value"]),
];

export const schema = {
  business: {
    sales: { fields: salesFields, data: salesRows },
    finance: { fields: financeFields, data: financeRows },
    sankey_data: { fields: sankeyFields, data: sankeyRows },
    geo_data: { fields: geoFields, data: geoRows },
    heatmap_data: { fields: heatmapFields, data: heatmapRows },
    scatter_data: { fields: scatterFields, data: scatterRows },
    hierarchy_data: { fields: hierarchyFields, data: hierarchyRows },
    calendar_data: { fields: calendarFields, data: calendarRows },
  },
  analytics: {
    users: { fields: userFields, data: userRows },
  },
  research: {
    research: { fields: researchFields, data: researchRows },
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
      label: titleCase(name),
      rowCount: rows.length,
    },
  ])
);
