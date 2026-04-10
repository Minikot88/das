export const pieCharts = {
  id: "pie",
  label: "Pie",
  iconKey: "pie",
  categories: ["distribution"],
  description: "Part-to-whole composition with pie and doughnut layouts.",
  variants: [
    { id: "referer-website", label: "Referer of a Website", description: "Website referrer composition.", family: "pie", exampleKey: "referer-website", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "rounded-doughnut-chart", label: "Doughnut Chart with Rounded Corner", description: "Donut with softened ring edges.", family: "pie", exampleKey: "rounded-doughnut-chart", chartId: "donut", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "doughnut-chart", label: "Doughnut Chart", description: "Classic donut chart.", family: "pie", exampleKey: "doughnut-chart", chartId: "donut", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "half-doughnut-chart", label: "Half Doughnut Chart", description: "Half-ring composition view.", family: "pie", exampleKey: "half-doughnut-chart", chartId: "half-donut", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "pie-pad-angle", label: "Pie with padAngle", description: "Pie chart with slice spacing.", family: "pie", exampleKey: "pie-pad-angle", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "customized-pie", label: "Customized Pie", description: "Custom styling and emphasis for pie slices.", family: "pie", exampleKey: "customized-pie", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "texture-on-pie", label: "Texture on Pie Chart", description: "Textured slice styling.", family: "pie", exampleKey: "texture-on-pie", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "metadata-ready" },
    { id: "nightingale-chart", label: "Nightingale Chart", description: "Rose / nightingale pie presentation.", family: "pie", exampleKey: "nightingale-chart", chartId: "rose", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "pie-label-align", label: "Pie Label Align", description: "Improved label alignment around a pie.", family: "pie", exampleKey: "pie-label-align", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "label-line-adjust", label: "Label Line Adjust", description: "Adjusted label connector lines.", family: "pie", exampleKey: "label-line-adjust", chartId: "pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "scrollable-legend-pie", label: "Pie with Scrollable Legend", description: "Pie with larger legend handling.", family: "pie", exampleKey: "scrollable-legend-pie", chartId: "scrollable-pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "supported" },
    { id: "pie-special-label", label: "Pie Special Label", description: "Rich special labels for slices.", family: "pie", exampleKey: "pie-special-label", chartId: "special-label-pie", requiredRoles: ["category", "value"], optionalRoles: ["label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "nested-pies", label: "Nested Pies", description: "Nested composition rings.", family: "pie", exampleKey: "nested-pies", chartId: "nested-pie", requiredRoles: ["category", "value"], optionalRoles: ["series", "label"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "partition-data-pies", label: "Partition Data to Pies", description: "Split dataset into multiple pie views.", family: "pie", exampleKey: "partition-data-pies", chartId: "dataset-pie", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pie", supportLevel: "partial" },
    { id: "default-arrangement-pie", label: "Default arrangement", description: "Default arrangement for partitioned pies.", family: "pie", exampleKey: "default-arrangement-pie", chartId: "dataset-pie", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pie", supportLevel: "metadata-ready" },
    { id: "pie-on-geo-map", label: "Pie Charts on GEO Map", description: "Pies placed on a map layout.", family: "pie", exampleKey: "pie-on-geo-map", chartId: "map", requiredRoles: ["region", "value"], optionalRoles: ["category"], renderingStrategy: "map-pie", supportLevel: "metadata-ready" },
    { id: "calendar-pie", label: "Calendar Pie", description: "Pie overlays in a calendar layout.", family: "pie", exampleKey: "calendar-pie", chartId: "calendar", requiredRoles: ["date", "value"], optionalRoles: ["category"], renderingStrategy: "calendar-pie", supportLevel: "metadata-ready" },
    { id: "share-dataset-pie", label: "Share Dataset", description: "Reuse dataset across pie views.", family: "pie", exampleKey: "share-dataset-pie", chartId: "dataset-pie", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pie", supportLevel: "partial" }
  ]
};

export default pieCharts;
