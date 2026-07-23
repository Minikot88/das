export const customCharts = {
  id: "custom",
  label: "Custom",
  iconKey: "custom",
  categories: ["advanced", "custom"],
  description: "Custom-series concepts and bespoke analytic visuals.",
  variants: [
    { id: "histogram-custom", label: "Histogram Custom", description: "Custom histogram-style chart.", family: "custom", exampleKey: "histogram-custom", chartId: "histogram", requiredRoles: ["value"], optionalRoles: [], renderingStrategy: "bar", supportLevel: "supported" },
    { id: "custom-series", label: "Custom Series", description: "General custom-series architecture.", family: "custom", exampleKey: "custom-series", chartId: "custom", requiredRoles: ["custom"], optionalRoles: ["value", "detail"], renderingStrategy: "custom", supportLevel: "partial" },
    { id: "error-bar-custom", label: "Error Bar", description: "Custom error-bar style rendering.", family: "custom", exampleKey: "error-bar-custom", chartId: "custom", requiredRoles: ["custom"], optionalRoles: ["value"], renderingStrategy: "custom", supportLevel: "metadata-ready" },
    { id: "gantt-custom", label: "Gantt", description: "Task timeline via custom rendering.", family: "custom", exampleKey: "gantt-custom", chartId: "custom-gantt", requiredRoles: ["category", "time", "target"], optionalRoles: ["value"], renderingStrategy: "custom", supportLevel: "partial" },
    { id: "flame-graph-custom", label: "Flame Graph", description: "Hierarchy-like flame graph concept.", family: "custom", exampleKey: "flame-graph-custom", chartId: "custom", requiredRoles: ["custom"], optionalRoles: ["value"], renderingStrategy: "custom", supportLevel: "metadata-ready" },
  ],
};

export default customCharts;
