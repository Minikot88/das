export const pictorialBarCharts = {
  id: "pictorialBar",
  label: "PictorialBar",
  iconKey: "pictorialBar",
  categories: ["comparison"],
  description: "Use icons or shapes instead of plain rectangles.",
  variants: [
    { id: "basic-pictorial-bar", label: "Pictorial Bar", description: "Shape-based bar chart.", family: "pictorialBar", exampleKey: "basic-pictorial-bar", chartId: "pictorial-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pictorial-bar", supportLevel: "supported" },
    { id: "dotted-pictorial-bar", label: "Dotted Bar", description: "Repeated symbols for bar fill.", family: "pictorialBar", exampleKey: "dotted-pictorial-bar", chartId: "pictorial-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pictorial-bar", supportLevel: "partial" },
    { id: "icon-pictorial-bar", label: "Icon Bar", description: "Icon-driven comparison chart.", family: "pictorialBar", exampleKey: "icon-pictorial-bar", chartId: "pictorial-bar", requiredRoles: ["category", "value"], optionalRoles: ["series"], renderingStrategy: "pictorial-bar", supportLevel: "partial" },
  ],
};

export default pictorialBarCharts;
