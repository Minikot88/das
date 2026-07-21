export const chordCharts = {
  id: "chord",
  label: "Chord",
  iconKey: "chord",
  categories: ["relationship"],
  description: "Circular relationship view for directional connectivity.",
  variants: [
    { id: "basic-chord", label: "Basic Chord", description: "Circular relationship diagram.", family: "chord", exampleKey: "basic-chord", chartId: "chord", requiredRoles: ["source", "target"], optionalRoles: ["value"], renderingStrategy: "graph", supportLevel: "partial" },
    { id: "min-angle-chord", label: "Chord with MinAngle", description: "Minimum-angle chord spacing.", family: "chord", exampleKey: "min-angle-chord", chartId: "chord", requiredRoles: ["source", "target"], optionalRoles: ["value"], renderingStrategy: "graph", supportLevel: "metadata-ready" },
    { id: "line-style-chord", label: "Chord LineStyle Color", description: "Chord with line-style color emphasis.", family: "chord", exampleKey: "line-style-chord", chartId: "chord", requiredRoles: ["source", "target"], optionalRoles: ["value"], renderingStrategy: "graph", supportLevel: "metadata-ready" },
  ],
};

export default chordCharts;
