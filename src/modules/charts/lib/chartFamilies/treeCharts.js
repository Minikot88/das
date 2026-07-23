export const treeCharts = {
  id: "tree",
  label: "Tree",
  iconKey: "tree",
  categories: ["hierarchy"],
  description: "Parent-child structures with directed hierarchy layouts.",
  variants: [
    { id: "basic-tree", label: "Basic Tree", description: "Standard top-down hierarchy.", family: "tree", exampleKey: "basic-tree", chartId: "tree", requiredRoles: ["hierarchy"], optionalRoles: ["value", "label"], renderingStrategy: "tree", supportLevel: "supported" },
    { id: "left-right-tree", label: "Left Right Tree", description: "Horizontal hierarchy layout.", family: "tree", exampleKey: "left-right-tree", chartId: "left-right-tree", requiredRoles: ["hierarchy"], optionalRoles: ["value", "label"], renderingStrategy: "tree", supportLevel: "supported" },
    { id: "radial-tree", label: "Radial Tree", description: "Circular hierarchy arrangement.", family: "tree", exampleKey: "radial-tree", chartId: "radial-tree", requiredRoles: ["hierarchy"], optionalRoles: ["value", "label"], renderingStrategy: "tree", supportLevel: "supported" },
  ],
};

export default treeCharts;
