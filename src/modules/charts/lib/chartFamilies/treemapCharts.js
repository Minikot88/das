export const treemapCharts = {
  id: "treemap",
  label: "Treemap",
  iconKey: "treemap",
  categories: ["hierarchy"],
  description: "Nested rectangles for hierarchical part-to-whole analysis.",
  variants: [
    { id: "basic-treemap", label: "Basic Treemap", description: "Standard treemap.", family: "treemap", exampleKey: "basic-treemap", chartId: "treemap", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "treemap", supportLevel: "supported" },
    { id: "gradient-treemap", label: "Gradient Treemap", description: "Treemap with gradient emphasis.", family: "treemap", exampleKey: "gradient-treemap", chartId: "gradient-treemap", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "treemap", supportLevel: "supported" },
    { id: "parent-label-treemap", label: "Parent Label Treemap", description: "Treemap emphasizing parent nodes.", family: "treemap", exampleKey: "parent-label-treemap", chartId: "basic-treemap", requiredRoles: ["hierarchy", "value"], optionalRoles: ["label"], renderingStrategy: "treemap", supportLevel: "partial" },
  ],
};

export default treemapCharts;
