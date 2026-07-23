export const richTextCharts = {
  id: "richText",
  label: "Rich Text",
  iconKey: "richText",
  categories: ["advanced", "custom"],
  description: "Text-driven chart styling with richer labels and callouts.",
  variants: [
    { id: "special-label-rich-text", label: "Pie Special Label", description: "Rich text labels around a pie.", family: "richText", exampleKey: "special-label-rich-text", chartId: "special-label-pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "rich-text-pie-family", label: "Rich Text Pie", description: "Pie with advanced label formatting.", family: "richText", exampleKey: "rich-text-pie-family", chartId: "rich-text-pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "rich-text-donut-family", label: "Rich Text Donut", description: "Donut with rich text labels.", family: "richText", exampleKey: "rich-text-donut-family", chartId: "rich-text-donut", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "donut", supportLevel: "supported" },
    { id: "weather-statistics-rich-text", label: "Weather Statistics Labels", description: "Rich stat labels and summaries.", family: "richText", exampleKey: "weather-statistics-rich-text", chartId: "rich-text-kpi", requiredRoles: ["value"], optionalRoles: ["label", "detail"], renderingStrategy: "kpi", supportLevel: "partial" },
  ],
};

export default richTextCharts;
