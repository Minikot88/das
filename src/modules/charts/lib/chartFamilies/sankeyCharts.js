export const sankeyCharts = {
  id: "sankey",
  label: "Sankey",
  iconKey: "sankey",
  categories: ["flow"],
  description: "Visualize movement and volume between stages or nodes.",
  variants: [
    { id: "basic-sankey", label: "Basic Sankey", description: "Standard left-to-right sankey.", family: "sankey", exampleKey: "basic-sankey", chartId: "sankey", requiredRoles: ["source", "target", "value"], optionalRoles: ["label"], renderingStrategy: "sankey", supportLevel: "supported" },
    { id: "vertical-sankey", label: "Vertical Sankey", description: "Vertical sankey orientation.", family: "sankey", exampleKey: "vertical-sankey", chartId: "vertical-sankey", requiredRoles: ["source", "target", "value"], optionalRoles: ["label"], renderingStrategy: "sankey", supportLevel: "supported" },
    { id: "gradient-sankey", label: "Gradient-edge Sankey", description: "Gradient edge styling.", family: "sankey", exampleKey: "gradient-sankey", chartId: "gradient-sankey", requiredRoles: ["source", "target", "value"], optionalRoles: ["label"], renderingStrategy: "sankey", supportLevel: "supported" },
  ],
};

export default sankeyCharts;
