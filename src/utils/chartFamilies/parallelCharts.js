export const parallelCharts = {
  id: "parallel",
  label: "Parallel",
  iconKey: "parallel",
  categories: ["statistical"],
  description: "Compare many numeric dimensions per row.",
  variants: [
    { id: "basic-parallel", label: "Basic Parallel", description: "Parallel coordinates for numeric dimensions.", family: "parallel", exampleKey: "basic-parallel", chartId: "parallel", requiredRoles: ["dimensions"], optionalRoles: ["series"], renderingStrategy: "parallel", supportLevel: "supported" },
    { id: "aqi-parallel", label: "AQI Parallel", description: "Air-quality style parallel coordinates.", family: "parallel", exampleKey: "aqi-parallel", chartId: "parallel", requiredRoles: ["dimensions"], optionalRoles: ["series"], renderingStrategy: "parallel", supportLevel: "partial" },
    { id: "nutrients-parallel", label: "Nutrients Parallel", description: "Multi-measure nutrient comparison.", family: "parallel", exampleKey: "nutrients-parallel", chartId: "parallel", requiredRoles: ["dimensions"], optionalRoles: ["series"], renderingStrategy: "parallel", supportLevel: "partial" },
  ],
};

export default parallelCharts;
