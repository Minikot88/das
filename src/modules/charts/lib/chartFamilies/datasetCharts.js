export const datasetCharts = {
  id: "dataset",
  label: "Dataset",
  iconKey: "dataset",
  categories: ["advanced"],
  description: "Dataset-first charting with reusable encodes and layouts.",
  variants: [
    { id: "dataset-simple-encode", label: "Simple Encode", description: "Dataset encode with a bar chart.", family: "dataset", exampleKey: "dataset-simple-encode", chartId: "dataset-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "dataset", supportLevel: "supported" },
    { id: "dataset-share", label: "Share Dataset", description: "Reuse one dataset across views.", family: "dataset", exampleKey: "dataset-share", chartId: "dataset-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "dataset", supportLevel: "supported" },
    { id: "dataset-object-array", label: "Dataset in Object Array", description: "Object-array dataset example.", family: "dataset", exampleKey: "dataset-object-array", chartId: "dataset-pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "dataset", supportLevel: "supported" },
    { id: "dataset-matrix", label: "Dataset Matrix", description: "Dataset-driven matrix setup.", family: "dataset", exampleKey: "dataset-matrix", chartId: "dataset-matrix", requiredRoles: ["column", "row", "value"], optionalRoles: ["label"], renderingStrategy: "dataset", supportLevel: "partial" },
    { id: "dataset-pivot", label: "Series Layout By Column or Row", description: "Pivoted dataset layout.", family: "dataset", exampleKey: "dataset-pivot", chartId: "dataset-pivot", requiredRoles: ["row", "column", "value"], optionalRoles: ["values"], renderingStrategy: "dataset", supportLevel: "partial" },
  ],
};

export default datasetCharts;
