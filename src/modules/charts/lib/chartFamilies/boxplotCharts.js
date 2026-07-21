export const boxplotCharts = { id: "boxplot", label: "Boxplot", iconKey: "boxplot", categories: ["distribution","statistical"], description: "Quartiles, spread, and outliers.", variants: [
  { id: "basic-boxplot", label: "Basic Boxplot", description: "Classic box-and-whisker plot.", family: "boxplot", exampleKey: "basic-boxplot", chartId: "boxplot", requiredRoles: ["category","value"], optionalRoles: ["min","q1","median","q3","max"], renderingStrategy: "boxplot", supportLevel: "supported" },
  { id: "aggregated-boxplot", label: "Aggregated Boxplot", description: "Uses precomputed quartile fields.", family: "boxplot", exampleKey: "aggregated-boxplot", chartId: "boxplot", requiredRoles: ["category"], optionalRoles: ["min","q1","median","q3","max"], renderingStrategy: "boxplot", supportLevel: "supported" },
  { id: "multi-category-boxplot", label: "Multi-category Boxplot", description: "Several categories of distributions.", family: "boxplot", exampleKey: "multi-category-boxplot", chartId: "boxplot", requiredRoles: ["category","value"], optionalRoles: ["series"], renderingStrategy: "boxplot", supportLevel: "supported" }
] };
export default boxplotCharts;
