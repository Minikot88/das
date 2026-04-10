export const graphicCharts = {
  id: "graphic",
  label: "Graphic",
  iconKey: "graphic",
  categories: ["advanced", "custom"],
  description: "Graphic overlays, annotation layers, and interaction affordances.",
  variants: [
    { id: "graphic-custom-component", label: "Custom Graphic Component", description: "Graphic overlay on a line chart.", family: "graphic", exampleKey: "graphic-custom-component", chartId: "graphic-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "graphic", supportLevel: "supported" },
    { id: "graphic-bar", label: "Graphic Bar", description: "Graphic overlay on a bar chart.", family: "graphic", exampleKey: "graphic-bar", chartId: "graphic-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "graphic", supportLevel: "supported" },
    { id: "graphic-draggable-points", label: "Draggable Points", description: "Drag handles and interactive marks.", family: "graphic", exampleKey: "graphic-draggable-points", chartId: "graphic-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "graphic", supportLevel: "supported" },
    { id: "graphic-click-add-points", label: "Click to Add Points", description: "Point creation interaction pattern.", family: "graphic", exampleKey: "graphic-click-add-points", chartId: "graphic-line", requiredRoles: ["x", "y"], optionalRoles: ["series"], renderingStrategy: "graphic", supportLevel: "metadata-ready" },
  ],
};

export default graphicCharts;
