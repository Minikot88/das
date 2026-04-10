export const sunburstCharts = {
  id: "sunburst",
  label: "Sunburst",
  iconKey: "sunburst",
  categories: ["hierarchy"],
  description: "Hierarchical rings for nested composition.",
  variants: [
    { id: "basic-sunburst", label: "Basic Sunburst", description: "Standard hierarchical sunburst.", family: "sunburst", exampleKey: "basic-sunburst", chartId: "sunburst", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "sunburst", supportLevel: "supported" },
    { id: "rounded-sunburst", label: "Rounded Corner Sunburst", description: "Rounded arc styling.", family: "sunburst", exampleKey: "rounded-sunburst", chartId: "rounded-sunburst", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "sunburst", supportLevel: "supported" },
    { id: "rotated-label-sunburst", label: "Rotated Label Sunburst", description: "Readable rotated labels.", family: "sunburst", exampleKey: "rotated-label-sunburst", chartId: "sunburst", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "sunburst", supportLevel: "partial" },
  ],
};

export default sunburstCharts;
