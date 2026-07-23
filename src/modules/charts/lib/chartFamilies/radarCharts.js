export const radarCharts = { id: "radar", label: "Radar", iconKey: "radar", categories: ["statistical"], description: "Compare profiles across multiple indicators.", variants: [
  { id: "basic-radar", label: "Basic Radar", description: "Single radar comparison.", family: "radar", exampleKey: "basic-radar", chartId: "radar", requiredRoles: ["category","value"], optionalRoles: ["series","values"], renderingStrategy: "radar", supportLevel: "supported" },
  { id: "multi-radar", label: "Multi-radar", description: "Compare several radar series.", family: "radar", exampleKey: "multi-radar", chartId: "radar", requiredRoles: ["category","value"], optionalRoles: ["series","values"], renderingStrategy: "radar", supportLevel: "partial" },
  { id: "browser-aqi-radar", label: "Browser/AQI-style Radar", description: "Category score radar layout.", family: "radar", exampleKey: "browser-aqi-radar", chartId: "radar", requiredRoles: ["category","value"], optionalRoles: ["series","values"], renderingStrategy: "radar", supportLevel: "supported" }
] };
export default radarCharts;
