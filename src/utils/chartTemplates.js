const DEFAULT_PALETTE = ["#2563eb", "#0891b2", "#10b981", "#7c3aed", "#f59e0b"];

const chartTemplates = [
  {
    id: "bar-basic",
    name: "Bar Basic",
    type: "bar",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
    palette: DEFAULT_PALETTE,
  },
  {
    id: "bar-comparison",
    name: "Category Comparison",
    type: "grouped-bar",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
    palette: DEFAULT_PALETTE,
  },
  {
    id: "line-trend",
    name: "Line Trend",
    type: "line",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
    palette: DEFAULT_PALETTE,
  },
  {
    id: "area-trend",
    name: "Area Trend",
    type: "area",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
    palette: DEFAULT_PALETTE,
  },
  {
    id: "category-comparison",
    name: "Category Comparison",
    type: "bar",
    defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
    palette: DEFAULT_PALETTE,
  },
];

export function getChartTemplates() {
  return chartTemplates;
}

export function getChartTemplateById(id) {
  return chartTemplates.find((template) => template.id === id) ?? chartTemplates[0];
}
