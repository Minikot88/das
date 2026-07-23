export const gaugeCharts = {
  id: "gauge",
  label: "Gauge",
  iconKey: "gauge",
  categories: ["comparison", "advanced"],
  description: "Single-metric dials, rings, and status gauges.",
  variants: [
    { id: "basic-gauge", label: "Basic Gauge", description: "Classic gauge dial.", family: "gauge", exampleKey: "basic-gauge", chartId: "gauge", requiredRoles: ["value"], optionalRoles: ["targetValue", "label"], renderingStrategy: "gauge", supportLevel: "supported" },
    { id: "simple-gauge", label: "Simple Gauge", description: "Minimal dial treatment.", family: "gauge", exampleKey: "simple-gauge", chartId: "simple-gauge", requiredRoles: ["value"], optionalRoles: ["targetValue", "label"], renderingStrategy: "gauge", supportLevel: "supported" },
    { id: "speed-gauge", label: "Speed Gauge", description: "Speedometer-style metric dial.", family: "gauge", exampleKey: "speed-gauge", chartId: "speed-gauge", requiredRoles: ["value"], optionalRoles: ["targetValue", "label"], renderingStrategy: "gauge", supportLevel: "supported" },
    { id: "progress-ring", label: "Progress Ring", description: "Radial progress ring.", family: "gauge", exampleKey: "progress-ring", chartId: "progress-ring", requiredRoles: ["progress"], optionalRoles: ["targetValue", "label"], renderingStrategy: "progress-ring", supportLevel: "supported" },
    { id: "stage-gauge", label: "Stage Gauge", description: "Grade or threshold gauge.", family: "gauge", exampleKey: "stage-gauge", chartId: "stage-gauge", requiredRoles: ["value"], optionalRoles: ["targetValue", "label"], renderingStrategy: "gauge", supportLevel: "supported" },
    { id: "barometer-gauge", label: "Barometer", description: "Barometer-style gauge.", family: "gauge", exampleKey: "barometer-gauge", chartId: "barometer-gauge", requiredRoles: ["value"], optionalRoles: ["targetValue", "label"], renderingStrategy: "gauge", supportLevel: "supported" },
    { id: "ring-gauge", label: "Ring Gauge", description: "Circular ring treatment for a KPI.", family: "gauge", exampleKey: "ring-gauge", chartId: "ring-gauge", requiredRoles: ["progress"], optionalRoles: ["targetValue", "label"], renderingStrategy: "progress-ring", supportLevel: "supported" },
  ],
};

export default gaugeCharts;
