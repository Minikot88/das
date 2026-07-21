export const themeRiverCharts = {
  id: "themeRiver",
  label: "ThemeRiver",
  iconKey: "themeRiver",
  categories: ["trend", "flow"],
  description: "Layered streams over time for thematic movement.",
  variants: [
    { id: "basic-theme-river", label: "Standard ThemeRiver", description: "Multi-series theme river.", family: "themeRiver", exampleKey: "basic-theme-river", chartId: "theme-river", requiredRoles: ["time", "series", "value"], optionalRoles: [], renderingStrategy: "theme-river", supportLevel: "supported" },
    { id: "multi-series-theme-river", label: "Multi-series ThemeRiver", description: "Multiple themes over time.", family: "themeRiver", exampleKey: "multi-series-theme-river", chartId: "theme-river", requiredRoles: ["time", "series", "value"], optionalRoles: [], renderingStrategy: "theme-river", supportLevel: "supported" },
  ],
};

export default themeRiverCharts;
