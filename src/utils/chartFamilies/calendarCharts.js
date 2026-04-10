export const calendarCharts = {
  id: "calendar",
  label: "Calendar",
  iconKey: "calendar",
  categories: ["trend"],
  description: "Place values on dates inside a calendar grid.",
  variants: [
    { id: "simple-calendar", label: "Simple Calendar", description: "Date-based calendar chart.", family: "calendar", exampleKey: "simple-calendar", chartId: "calendar", requiredRoles: ["date", "value"], optionalRoles: ["series"], renderingStrategy: "calendar", supportLevel: "supported" },
    { id: "calendar-heatmap-family", label: "Calendar Heatmap", description: "Heatmap values on calendar cells.", family: "calendar", exampleKey: "calendar-heatmap-family", chartId: "calendar-heatmap", requiredRoles: ["date", "value"], optionalRoles: ["series"], renderingStrategy: "calendar", supportLevel: "supported" },
    { id: "calendar-graph", label: "Calendar Graph", description: "Calendar layout prepared for graph overlays.", family: "calendar", exampleKey: "calendar-graph", chartId: "calendar", requiredRoles: ["date", "value"], optionalRoles: ["series"], renderingStrategy: "calendar", supportLevel: "metadata-ready" },
    { id: "calendar-pie", label: "Calendar Pie", description: "Calendar layout prepared for pie overlays.", family: "calendar", exampleKey: "calendar-pie", chartId: "calendar", requiredRoles: ["date", "value"], optionalRoles: ["series"], renderingStrategy: "calendar", supportLevel: "metadata-ready" },
  ],
};

export default calendarCharts;
