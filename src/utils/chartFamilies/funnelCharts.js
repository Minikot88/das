export const funnelCharts = {
  id: "funnel",
  label: "Funnel",
  iconKey: "funnel",
  categories: ["flow"],
  description: "Show ordered stage drop-off or conversion.",
  variants: [
    { id: "basic-funnel", label: "Basic Funnel", description: "Standard stage funnel.", family: "funnel", exampleKey: "basic-funnel", chartId: "funnel", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "funnel", supportLevel: "supported" },
    { id: "compare-funnel", label: "Compare Funnel", description: "Comparison-oriented funnel arrangement.", family: "funnel", exampleKey: "compare-funnel", chartId: "funnel", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "funnel", supportLevel: "partial" },
    { id: "custom-funnel", label: "Custom Funnel", description: "Custom-styled funnel presentation.", family: "funnel", exampleKey: "custom-funnel", chartId: "funnel", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "funnel", supportLevel: "partial" },
  ],
};

export default funnelCharts;
