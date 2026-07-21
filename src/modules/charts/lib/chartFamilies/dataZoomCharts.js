export const dataZoomCharts = {
  id: "dataZoom",
  label: "DataZoom",
  iconKey: "dataZoom",
  categories: ["trend", "advanced"],
  description: "Interactive zooming and mobile-friendly large-scale charts.",
  variants: [
    { id: "zoomable-line", label: "Zoomable Line", description: "Line chart with data zoom behavior.", family: "dataZoom", exampleKey: "zoomable-line", chartId: "datazoom-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "line", supportLevel: "supported" },
    { id: "zoomable-bar", label: "Zoomable Bar", description: "Bar chart with data zoom behavior.", family: "dataZoom", exampleKey: "zoomable-bar", chartId: "datazoom-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "bar", supportLevel: "supported" },
    { id: "mobile-tooltip-datazoom", label: "Tooltip and DataZoom on Mobile", description: "Touch-friendly zoom and tooltip.", family: "dataZoom", exampleKey: "mobile-tooltip-datazoom", chartId: "datazoom-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "line", supportLevel: "supported" },
  ],
};

export default dataZoomCharts;
