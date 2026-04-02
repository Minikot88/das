// ─── Type helpers ───────────────────────────────────────────────
export const TYPE_BADGE = { string: "STR", number: "NUM", date: "DATE", boolean: "BOOL" };
export const TYPE_COLOR = { string: "#52c41a", number: "#1677ff", date: "#fa8c16", boolean: "#722ed1" };

// ─── Schema (simulates a real DB schema) ────────────────────────
export const schema = {
  business: {
    sales: {
      fields: [
        { name: "date",     type: "date"   },
        { name: "product",  type: "string" },
        { name: "category", type: "string" },
        { name: "sales",    type: "number" },
        { name: "profit",   type: "number" },
        { name: "region",   type: "string" },
      ],
      data: [
        { date: "2024-01", product: "Laptop", category: "Electronics", sales: 120000, profit: 25000, region: "North" },
        { date: "2024-02", product: "Phone",  category: "Electronics", sales: 90000,  profit: 18000, region: "South" },
        { date: "2024-03", product: "Shoes",  category: "Fashion",     sales: 40000,  profit: 12000, region: "West" },
        { date: "2024-04", product: "Watch",  category: "Fashion",     sales: 30000,  profit: 9000,  region: "East" },
        { date: "2024-05", product: "Laptop", category: "Electronics", sales: 150000, profit: 35000, region: "North" },
        { date: "2024-06", product: "Phone",  category: "Electronics", sales: 110000, profit: 22000, region: "South" },
      ],
    },
    finance: {
      fields: [
        { name: "month",   type: "string" },
        { name: "revenue", type: "number" },
        { name: "expense", type: "number" },
      ],
      data: [
        { month: "Jan", revenue: 200000, expense: 150000 },
        { month: "Feb", revenue: 250000, expense: 180000 },
        { month: "Mar", revenue: 300000, expense: 210000 },
        { month: "Apr", revenue: 280000, expense: 190000 },
        { month: "May", revenue: 320000, expense: 230000 },
        { month: "Jun", revenue: 350000, expense: 250000 },
      ],
    },
    inventory: {
      fields: [
        { name: "product", type: "string" },
        { name: "stock",   type: "number" },
        { name: "price",   type: "number" },
      ],
      data: [
        { product: "Laptop", stock: 50,  price: 1200 },
        { product: "Phone",  stock: 120, price: 800  },
        { product: "Shoes",  stock: 200, price: 60   },
        { product: "Watch",  stock: 80,  price: 250  },
      ],
    },
  },
  analytics: {
    users: {
      fields: [
        { name: "date",   type: "date"   },
        { name: "users",  type: "number" },
        { name: "active", type: "number" },
        { name: "bounce", type: "number" },
      ],
      data: [
        { date: "2024-01", users: 1200, active: 800,  bounce: 0.35 },
        { date: "2024-02", users: 1500, active: 1100, bounce: 0.28 },
        { date: "2024-03", users: 1800, active: 1400, bounce: 0.22 },
        { date: "2024-04", users: 2200, active: 1700, bounce: 0.18 },
        { date: "2024-05", users: 2500, active: 2000, bounce: 0.15 },
        { date: "2024-06", users: 2800, active: 2300, bounce: 0.14 },
      ],
    },
  },
  research: {
    scopus: {
      fields: [
        { name: "id",              type: "string" },
        { name: "dc_title",        type: "string" },
        { name: "citedby_count",   type: "number" },
        { name: "download_count",  type: "number" },
        { name: "prism_coverDate", type: "date"   },
        { name: "subject_area",    type: "string" },
      ],
      data: [
        { id: "1", dc_title: "Machine Learning",     citedby_count: 245, download_count: 1200, prism_coverDate: "2020", subject_area: "CS" },
        { id: "2", dc_title: "Deep Learning",        citedby_count: 380, download_count: 2100, prism_coverDate: "2021", subject_area: "AI" },
        { id: "3", dc_title: "Neural Networks",      citedby_count: 190, download_count:  980, prism_coverDate: "2022", subject_area: "CS" },
        { id: "4", dc_title: "Computer Vision",      citedby_count: 520, download_count: 3400, prism_coverDate: "2023", subject_area: "AI" },
        { id: "5", dc_title: "NLP",                  citedby_count: 310, download_count: 1750, prism_coverDate: "2024", subject_area: "AI" },
      ],
    },
  },
};

// ─── Flat datasets (for ChartRenderer lookup) ────────────────────
export const datasets = Object.fromEntries(
  Object.values(schema).flatMap((db) =>
    Object.entries(db).map(([tbl, info]) => [tbl, info.data])
  )
);
