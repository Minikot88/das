export const linesCharts = {
  id: "lines",
  label: "Lines",
  iconKey: "lines",
  categories: ["flow", "geo"],
  description: "Routes, movement paths, and geographic line overlays.",
  variants: [
    { id: "basic-lines", label: "Basic Lines", description: "Simple source-to-target routes.", family: "lines", exampleKey: "basic-lines", chartId: "lines", requiredRoles: ["geoFrom", "geoTo"], optionalRoles: ["value", "series"], renderingStrategy: "lines", supportLevel: "partial" },
    { id: "flight-lines", label: "Flight Routes", description: "Animated travel-style routes.", family: "lines", exampleKey: "flight-lines", chartId: "map-lines", requiredRoles: ["geoFrom", "geoTo"], optionalRoles: ["value", "series"], renderingStrategy: "lines", supportLevel: "partial" },
    { id: "od-lines", label: "OD Lines", description: "Origin-destination flow links.", family: "lines", exampleKey: "od-lines", chartId: "map-lines", requiredRoles: ["geoFrom", "geoTo"], optionalRoles: ["value"], renderingStrategy: "lines", supportLevel: "partial" },
  ],
};

export default linesCharts;
