export const mapCharts = { id: "map", label: "GEO/Map", iconKey: "map", categories: ["geo"], description: "Maps, choropleths, geo scatter, and geo graph overlays.", variants: [
  { id: "choropleth-map", label: "Choropleth Map", description: "Region-colored value map.", family: "map", exampleKey: "choropleth-map", chartId: "map", requiredRoles: ["region", "value"], optionalRoles: ["label"], renderingStrategy: "map", supportLevel: "partial" },
  { id: "geo-scatter-map", label: "Geo Scatter", description: "Scatter points on a map.", family: "map", exampleKey: "geo-scatter-map", chartId: "geo-scatter", requiredRoles: ["region", "value"], optionalRoles: ["size", "series"], renderingStrategy: "map-scatter", supportLevel: "partial" },
  { id: "geo-graph-map", label: "Geo Graph", description: "Network overlays on a geo layer.", family: "map", exampleKey: "geo-graph-map", chartId: "geo-graph", requiredRoles: ["source", "target"], optionalRoles: ["value"], renderingStrategy: "graph", supportLevel: "partial" },
  { id: "svg-map", label: "SVG Map", description: "SVG-backed map metadata path.", family: "map", exampleKey: "svg-map", chartId: "geo-map", requiredRoles: ["region", "value"], optionalRoles: ["label"], renderingStrategy: "map", supportLevel: "metadata-ready" }
] };
export default mapCharts;
