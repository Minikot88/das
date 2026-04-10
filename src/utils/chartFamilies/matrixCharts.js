export const matrixCharts = {
  id: "matrix",
  label: "Matrix",
  iconKey: "matrix",
  categories: ["advanced"],
  description: "Grid-style analytical layouts for rows, columns, and measures.",
  variants: [
    { id: "simple-matrix", label: "Simple Matrix", description: "Basic matrix/grid comparison.", family: "matrix", exampleKey: "simple-matrix", chartId: "matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "matrix", supportLevel: "supported" },
    { id: "correlation-matrix", label: "Correlation Matrix Heatmap", description: "Heatmap for correlation-like values.", family: "matrix", exampleKey: "correlation-matrix", chartId: "matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "matrix", supportLevel: "partial" },
    { id: "confusion-matrix", label: "Confusion Matrix", description: "Classification-style matrix layout.", family: "matrix", exampleKey: "confusion-matrix", chartId: "matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "matrix", supportLevel: "partial" },
    { id: "mini-line-matrix", label: "Mini Line Charts (Sparkline) in Matrix", description: "Matrix layout with tiny line charts.", family: "matrix", exampleKey: "mini-line-matrix", chartId: "matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "matrix", supportLevel: "metadata-ready" },
    { id: "mini-bar-matrix", label: "Mini Bars and Geo in Matrix", description: "Matrix layout with compact bars and geo cues.", family: "matrix", exampleKey: "mini-bar-matrix", chartId: "matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "matrix", supportLevel: "metadata-ready" },
  ],
};

export default matrixCharts;
