import { FIELD_ROLES, getChartRequirements } from "./chartRequirements";
import { CHART_SELECTOR_FAMILIES as FAMILY_SELECTOR_CATALOG } from "./chartFamilies";

export { FIELD_ROLES };

const CHART_CATEGORIES = [
  { id: "recommended", label: "Recommended", description: "Best fits for the current mapping." },
  { id: "comparison", label: "Comparison", description: "Compare values across categories or series." },
  { id: "trend", label: "Trend", description: "Show change over ordered sequences or time." },
  { id: "distribution", label: "Distribution", description: "Inspect spread, bins, ranges, and outliers." },
  { id: "relationship", label: "Relationship", description: "Explore correlation and multivariate patterns." },
  { id: "hierarchy", label: "Hierarchy", description: "Roll up values through nested structures." },
  { id: "flow", label: "Flow", description: "Show movement between stages, paths, and nodes." },
  { id: "statistical", label: "Statistical", description: "Use analytical or specialized chart types." },
  { id: "geo", label: "Geo", description: "Render region and geography-based charts." },
  { id: "advanced", label: "Advanced", description: "Use advanced ECharts series and custom layouts." },
  { id: "custom", label: "Custom", description: "Render custom or extension-based visuals." },
];

function chart(definition) {
  return {
    hidden: false,
    supported: true,
    previewSupported: true,
    badges: [],
    badgeTone: "default",
    advanced: false,
    experimental: false,
    recommended: false,
    defaultConfig: {},
    previewSample: null,
    ...definition,
  };
}

const CHART_DEFINITIONS = [
  chart({ id: "bar", name: "Bar", label: "Bar", shortName: "BAR", family: "bar", preset: "basic", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar", description: "Compare a metric across categories.", badges: ["Popular"], recommended: true, defaultConfig: { legendVisible: true, showGrid: true }, previewSample: { rows: [{ category: "North", value: 128 }, { category: "South", value: 92 }, { category: "West", value: 154 }, { category: "East", value: 111 }], config: { x: "category", y: "value", title: "Regional sales" } } }),
  chart({ id: "grouped-bar", name: "Grouped Bar", label: "Grouped Bar", shortName: "GB", family: "bar", preset: "grouped", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "grouped-bar", description: "Compare categories across multiple series side by side.", badges: ["Series"], previewSample: { rows: [{ category: "Q1", series: "Plan", value: 80 }, { category: "Q1", series: "Actual", value: 92 }, { category: "Q2", series: "Plan", value: 96 }, { category: "Q2", series: "Actual", value: 105 }], config: { x: "category", y: "value", groupBy: "series", title: "Plan vs actual" } } }),
  chart({ id: "stacked-bar", name: "Stacked Bar", label: "Stacked Bar", shortName: "SB", family: "bar", preset: "stacked", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "stacked-bar", description: "Show totals and composition inside each category.", badges: ["Stacked"] }),
  chart({ id: "horizontal-bar", name: "Horizontal Bar", label: "Horizontal Bar", shortName: "HB", family: "bar", preset: "horizontal", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "horizontal-bar", description: "Use horizontal bars for long category labels." }),
  chart({ id: "waterfall", name: "Waterfall", label: "Waterfall", shortName: "WF", family: "bar", preset: "waterfall", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "waterfall", description: "Show cumulative increases and decreases across steps.", advanced: true }),
  chart({ id: "bar-racing", name: "Bar Racing", label: "Bar Racing", shortName: "BR", family: "bar", preset: "racing", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar-racing", description: "Animate ranked bars across time.", advanced: true }),
  chart({ id: "pictorial-bar", name: "Pictorial Bar", label: "Pictorial Bar", shortName: "PB", family: "pictorialBar", preset: "basic", category: "comparison", group: "comparison", echartsSeriesType: "pictorialBar", renderType: "pictorial-bar", description: "Use pictorial shapes instead of plain bars.", advanced: true }),
  chart({ id: "line", name: "Line", label: "Line", shortName: "LN", family: "line", preset: "basic", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "line", description: "Track change through an ordered sequence.", badges: ["Popular"], recommended: true }),
  chart({ id: "multi-line", name: "Multi Line", label: "Multi Line", shortName: "ML", family: "line", preset: "grouped", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "line", description: "Compare multiple lines on the same axes.", badges: ["Series"] }),
  chart({ id: "smooth-line", name: "Smooth Line", label: "Smooth Line", shortName: "SL", family: "line", preset: "smooth", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "smooth-line", description: "Use a smoothed curve for trend emphasis." }),
  chart({ id: "step-line", name: "Step Line", label: "Step Line", shortName: "ST", family: "line", preset: "step", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "step-line", description: "Show discrete jumps between points." }),
  chart({ id: "area", name: "Area", label: "Area", shortName: "AR", family: "line", preset: "area", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "area", description: "Use a filled line for volume emphasis." }),
  chart({ id: "stacked-line", name: "Stacked Line", label: "Stacked Line", shortName: "SKL", family: "line", preset: "stacked", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "multi-line", description: "Compare cumulative multi-series trends with a safe grouped-line fallback.", advanced: true }),
  chart({ id: "stacked-area", name: "Stacked Area", label: "Stacked Area", shortName: "SA", family: "line", preset: "stacked-area", variantOf: "line", category: "trend", group: "trend", echartsSeriesType: "line", renderType: "stacked-area", description: "Track total change and component contribution." }),
  chart({ id: "pie", name: "Pie", label: "Pie", shortName: "PI", family: "pie", preset: "basic", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "pie", description: "Show part-to-whole composition for one series." }),
  chart({ id: "donut", name: "Donut", label: "Donut", shortName: "DN", family: "pie", preset: "donut", variantOf: "pie", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "donut", description: "Show part-to-whole composition with a center hole." }),
  chart({ id: "rose", name: "Rose Pie", label: "Rose Pie", shortName: "RS", family: "pie", preset: "rose", variantOf: "pie", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "rose", description: "Use pie radius to emphasize category differences.", advanced: true }),
  chart({ id: "scatter", name: "Scatter", label: "Scatter", shortName: "SC", family: "scatter", preset: "basic", category: "relationship", group: "relationship", echartsSeriesType: "scatter", renderType: "scatter", description: "Compare two measures on X and Y.", badges: ["Popular"] }),
  chart({ id: "effect-scatter", name: "Effect Scatter", label: "Effect Scatter", shortName: "ES", family: "effectScatter", preset: "basic", category: "relationship", group: "relationship", echartsSeriesType: "effectScatter", renderType: "effect-scatter", description: "Add ripple emphasis to scatter marks.", advanced: true }),
  chart({ id: "bubble", name: "Bubble", label: "Bubble", shortName: "BB", family: "scatter", preset: "bubble", variantOf: "scatter", category: "relationship", group: "relationship", echartsSeriesType: "scatter", renderType: "bubble", description: "Use bubble size for a third measure." }),
  chart({ id: "radar", name: "Radar", label: "Radar", shortName: "RD", family: "radar", preset: "basic", category: "relationship", group: "relationship", echartsSeriesType: "radar", renderType: "radar", description: "Compare profiles across multiple indicators." }),
  chart({ id: "heatmap", name: "Heatmap", label: "Heatmap", shortName: "HM", family: "heatmap", preset: "basic", category: "distribution", group: "distribution", echartsSeriesType: "heatmap", renderType: "heatmap", description: "Show density across rows and columns." }),
  chart({ id: "matrix", name: "Matrix", label: "Matrix", shortName: "MX", family: "heatmap", preset: "matrix", variantOf: "heatmap", category: "distribution", group: "distribution", echartsSeriesType: "heatmap", renderType: "matrix", description: "Use a matrix grid to compare row and column intersections.", advanced: true, previewSample: { rows: [{ column: "North", row: "Q1", value: 18 }, { column: "South", row: "Q1", value: 12 }, { column: "North", row: "Q2", value: 22 }, { column: "South", row: "Q2", value: 15 }], config: { roleMapping: { column: [{ name: "column", type: "string" }], row: [{ name: "row", type: "string" }], value: [{ name: "value", type: "number" }] }, title: "Coverage matrix" } } }),
  chart({ id: "tree", name: "Tree", label: "Tree", shortName: "TR", family: "tree", preset: "basic", category: "hierarchy", group: "hierarchy", echartsSeriesType: "tree", renderType: "tree", description: "Render a parent-child hierarchy as a tree.", advanced: true }),
  chart({ id: "treemap", name: "Treemap", label: "Treemap", shortName: "TM", family: "treemap", preset: "basic", category: "hierarchy", group: "hierarchy", echartsSeriesType: "treemap", renderType: "treemap", description: "Use nested rectangles to show hierarchy and value." }),
  chart({ id: "sunburst", name: "Sunburst", label: "Sunburst", shortName: "SBT", family: "sunburst", preset: "basic", category: "hierarchy", group: "hierarchy", echartsSeriesType: "sunburst", renderType: "sunburst", description: "Use concentric rings for hierarchy and value." }),
  chart({ id: "sankey", name: "Sankey", label: "Sankey", shortName: "SK", family: "sankey", preset: "basic", category: "flow", group: "flow", echartsSeriesType: "sankey", renderType: "sankey", description: "Show flow between stages or nodes." }),
  chart({ id: "theme-river", name: "Theme River", label: "Theme River", shortName: "RV", family: "themeRiver", preset: "basic", category: "flow", group: "flow", echartsSeriesType: "themeRiver", renderType: "theme-river", description: "Stack themed streams across time.", advanced: true }),
  chart({ id: "calendar", name: "Calendar Heatmap", label: "Calendar", shortName: "CL", family: "calendar", preset: "heatmap", category: "trend", group: "trend", echartsSeriesType: "heatmap", renderType: "calendar", description: "Show daily values inside a calendar layout.", advanced: true, previewSample: { rows: [{ date: "2026-01-01", value: 12 }, { date: "2026-01-02", value: 24 }, { date: "2026-01-03", value: 18 }, { date: "2026-01-04", value: 31 }], config: { x: "date", y: "value", title: "Daily activity" } } }),
  chart({ id: "lines", name: "Geo Lines", label: "Geo Lines", shortName: "GL", family: "lines", preset: "basic", category: "flow", group: "flow", echartsSeriesType: "lines", renderType: "lines", description: "Show movement between locations.", advanced: true }),
  chart({ id: "graph", name: "Graph", label: "Graph", shortName: "GR", family: "graph", preset: "network", category: "relationship", group: "relationship", echartsSeriesType: "graph", renderType: "graph", description: "Render network nodes and links.", advanced: true }),
  chart({ id: "boxplot", name: "Boxplot", label: "Boxplot", shortName: "BX", family: "boxplot", preset: "basic", category: "statistical", group: "statistical", echartsSeriesType: "boxplot", renderType: "boxplot", description: "Show quartiles, spread, and outliers.", advanced: true }),
  chart({ id: "parallel", name: "Parallel", label: "Parallel", shortName: "PL", family: "parallel", preset: "basic", category: "statistical", group: "statistical", echartsSeriesType: "parallel", renderType: "parallel", description: "Compare multiple numeric dimensions per row.", advanced: true }),
  chart({ id: "candlestick", name: "Candlestick", label: "Candlestick", shortName: "CS", family: "candlestick", preset: "basic", category: "statistical", group: "statistical", echartsSeriesType: "candlestick", renderType: "candlestick", description: "Render financial open, high, low, and close values.", advanced: true }),
  chart({ id: "histogram", name: "Histogram", label: "Histogram", shortName: "HG", family: "bar", preset: "histogram", category: "distribution", group: "distribution", echartsSeriesType: "bar", renderType: "histogram", description: "Bin a numeric field into value ranges.", advanced: true }),
  chart({ id: "gauge", name: "Gauge", label: "Gauge", shortName: "GG", family: "gauge", preset: "basic", category: "advanced", group: "advanced", echartsSeriesType: "gauge", renderType: "gauge", description: "Show a single metric against a dial." }),
  chart({ id: "progress-ring", name: "Progress Ring", label: "Progress Ring", shortName: "PR", family: "gauge", preset: "ring", category: "advanced", group: "advanced", echartsSeriesType: "pie", renderType: "progress-ring", description: "Show one metric as a radial progress ring." }),
  chart({ id: "funnel", name: "Funnel", label: "Funnel", shortName: "FN", family: "funnel", preset: "basic", category: "flow", group: "flow", echartsSeriesType: "funnel", renderType: "funnel", description: "Show ordered conversion or stage drop-off." }),
  chart({ id: "map", name: "Map", label: "Map", shortName: "MP", family: "map", preset: "region", category: "geo", group: "geo", echartsSeriesType: "map", renderType: "map", description: "Color regions by value on a map.", advanced: true }),
  chart({ id: "custom", name: "Custom", label: "Custom", shortName: "CU", family: "custom", preset: "basic", category: "custom", group: "custom", echartsSeriesType: "custom", renderType: "custom", description: "Use a custom series for advanced rendering logic.", advanced: true, experimental: true }),
  chart({ id: "table", name: "Table", label: "Table", shortName: "TB", family: "table", preset: "basic", category: "advanced", group: "advanced", echartsSeriesType: "table", renderType: "table", description: "Inspect raw rows in a table view." }),
  chart({ id: "pivot-table", name: "Pivot Table", label: "Pivot Table", shortName: "PT", family: "table", preset: "pivot", category: "advanced", group: "advanced", echartsSeriesType: "table", renderType: "pivot-table", description: "Inspect a value pivoted by row and column.", advanced: true }),
  chart({ id: "kpi", name: "KPI", label: "KPI", shortName: "KP", family: "summary", preset: "basic", category: "advanced", group: "advanced", echartsSeriesType: "custom", renderType: "kpi", description: "Show a single big-number summary." }),
  chart({ id: "styled-bar", name: "Styled Bar", label: "Styled Bar", shortName: "SB2", family: "bar", preset: "styled", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar", description: "Styled single-bar presentation with a safe bar fallback.", advanced: true, badges: ["Style"] }),
  chart({ id: "background-bar", name: "Bar Background", label: "Bar Background", shortName: "BBG", family: "bar", preset: "background", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar", description: "Bar with background tracks.", advanced: true }),
  chart({ id: "negative-bar", name: "Negative Bar", label: "Negative Bar", shortName: "NB", family: "bar", preset: "negative", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar", description: "Bar layout tuned for positive and negative values.", advanced: true }),
  chart({ id: "sorted-bar", name: "Sorted Bar", label: "Sorted Bar", shortName: "SRT", family: "bar", preset: "sorted", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "bar", description: "Sorted bar ordering with a stable bar preview.", advanced: true }),
  chart({ id: "mixed-line-bar", name: "Mixed Line + Bar", label: "Mixed Line + Bar", shortName: "MLB", family: "bar", preset: "mixed", variantOf: "bar", category: "comparison", group: "comparison", echartsSeriesType: "bar", renderType: "grouped-bar", description: "Combination chart with a safe grouped-series preview.", advanced: true }),
  chart({ id: "half-donut", name: "Half Donut", label: "Half Donut", shortName: "HD", family: "pie", preset: "half-donut", variantOf: "donut", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "donut", description: "Half-donut preset with a stable donut preview.", advanced: true }),
  chart({ id: "nested-pie", name: "Nested Pie", label: "Nested Pie", shortName: "NP", family: "pie", preset: "nested", variantOf: "pie", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "donut", description: "Nested pie preset with a safe donut preview.", advanced: true }),
  chart({ id: "special-label-pie", name: "Special Label Pie", label: "Special Label Pie", shortName: "SLP", family: "pie", preset: "rich-label", variantOf: "pie", category: "advanced", group: "advanced", echartsSeriesType: "pie", renderType: "pie", description: "Pie configured for richer label layouts.", advanced: true, badges: ["Rich Text"] }),
  chart({ id: "scrollable-pie", name: "Scrollable Legend Pie", label: "Scrollable Pie", shortName: "SCP", family: "pie", preset: "scrollable", variantOf: "pie", category: "distribution", group: "distribution", echartsSeriesType: "pie", renderType: "pie", description: "Pie tuned for large legends with a stable core preview.", advanced: true }),
  chart({ id: "large-scatter", name: "Large Scatter", label: "Large Scatter", shortName: "LS", family: "scatter", preset: "large", variantOf: "scatter", category: "relationship", group: "relationship", echartsSeriesType: "scatter", renderType: "scatter", description: "Scatter preset prepared for denser datasets.", advanced: true }),
  chart({ id: "geo-scatter", name: "Geo Scatter", label: "Geo Scatter", shortName: "GS", family: "map", preset: "geo-scatter", category: "geo", group: "geo", echartsSeriesType: "scatter", renderType: "scatter", description: "Scatter family prepared for geo coordinate registration.", advanced: true }),
  chart({ id: "geo-map", name: "Geo Map", label: "Geo Map", shortName: "GM", family: "map", preset: "geo", variantOf: "map", category: "geo", group: "geo", echartsSeriesType: "map", renderType: "map", description: "Geo-based map preset.", advanced: true, previewSupported: false }),
  chart({ id: "geo-graph", name: "Geo Graph", label: "Geo Graph", shortName: "GGR", family: "map", preset: "geo-graph", category: "geo", group: "geo", echartsSeriesType: "graph", renderType: "graph", description: "Graph family prepared for geo overlays.", advanced: true }),
  chart({ id: "radial-tree", name: "Radial Tree", label: "Radial Tree", shortName: "RT", family: "tree", preset: "radial", variantOf: "tree", category: "hierarchy", group: "hierarchy", echartsSeriesType: "tree", renderType: "tree", description: "Radial tree preset with a safe tree preview.", advanced: true }),
  chart({ id: "left-right-tree", name: "Left Right Tree", label: "Left Right Tree", shortName: "LRT", family: "tree", preset: "left-right", variantOf: "tree", category: "hierarchy", group: "hierarchy", echartsSeriesType: "tree", renderType: "tree", description: "Alternate tree orientation preset.", advanced: true }),
  chart({ id: "basic-treemap", name: "Basic Treemap", label: "Basic Treemap", shortName: "BTM", family: "treemap", preset: "basic-alt", variantOf: "treemap", category: "hierarchy", group: "hierarchy", echartsSeriesType: "treemap", renderType: "treemap", description: "Treemap preset variant.", advanced: true }),
  chart({ id: "gradient-treemap", name: "Gradient Treemap", label: "Gradient Treemap", shortName: "GTM", family: "treemap", preset: "gradient", variantOf: "treemap", category: "hierarchy", group: "hierarchy", echartsSeriesType: "treemap", renderType: "treemap", description: "Treemap styled for gradients with a safe hierarchical preview.", advanced: true }),
  chart({ id: "rounded-sunburst", name: "Rounded Sunburst", label: "Rounded Sunburst", shortName: "RSB", family: "sunburst", preset: "rounded", variantOf: "sunburst", category: "hierarchy", group: "hierarchy", echartsSeriesType: "sunburst", renderType: "sunburst", description: "Rounded sunburst preset with a stable base preview.", advanced: true }),
  chart({ id: "vertical-sankey", name: "Vertical Sankey", label: "Vertical Sankey", shortName: "VSK", family: "sankey", preset: "vertical", variantOf: "sankey", category: "flow", group: "flow", echartsSeriesType: "sankey", renderType: "sankey", description: "Vertical sankey preset with a stable preview.", advanced: true }),
  chart({ id: "gradient-sankey", name: "Gradient Sankey", label: "Gradient Sankey", shortName: "GSK", family: "sankey", preset: "gradient", variantOf: "sankey", category: "flow", group: "flow", echartsSeriesType: "sankey", renderType: "sankey", description: "Gradient-edge sankey preset.", advanced: true }),
  chart({ id: "force-graph", name: "Force Graph", label: "Force Graph", shortName: "FG", family: "graph", preset: "force", variantOf: "graph", category: "relationship", group: "relationship", echartsSeriesType: "graph", renderType: "graph", description: "Force-style network preset with a safe graph preview.", advanced: true }),
  chart({ id: "dependency-graph", name: "Dependency Graph", label: "Dependency Graph", shortName: "DG", family: "graph", preset: "dependency", variantOf: "graph", category: "relationship", group: "relationship", echartsSeriesType: "graph", renderType: "graph", description: "Dependency graph preset.", advanced: true }),
  chart({ id: "chord", name: "Chord", label: "Chord", shortName: "CHD", family: "graph", preset: "chord", variantOf: "graph", category: "advanced", group: "advanced", echartsSeriesType: "graph", renderType: "graph", description: "Chord-style relationship view with a circular graph fallback.", advanced: true }),
  chart({ id: "ohlc", name: "OHLC", label: "OHLC", shortName: "OH", family: "candlestick", preset: "ohlc", variantOf: "candlestick", category: "statistical", group: "statistical", echartsSeriesType: "candlestick", renderType: "candlestick", description: "OHLC preset with a stable candlestick preview.", advanced: true }),
  chart({ id: "candlestick-large", name: "Large Candlestick", label: "Large Candlestick", shortName: "LCS", family: "candlestick", preset: "large", variantOf: "candlestick", category: "statistical", group: "statistical", echartsSeriesType: "candlestick", renderType: "candlestick", description: "Large-scale candlestick preset.", advanced: true }),
  chart({ id: "simple-gauge", name: "Simple Gauge", label: "Simple Gauge", shortName: "SG", family: "gauge", preset: "simple", variantOf: "gauge", category: "advanced", group: "advanced", echartsSeriesType: "gauge", renderType: "gauge", description: "Simple gauge preset." }),
  chart({ id: "speed-gauge", name: "Speed Gauge", label: "Speed Gauge", shortName: "SPG", family: "gauge", preset: "speed", variantOf: "gauge", category: "advanced", group: "advanced", echartsSeriesType: "gauge", renderType: "gauge", description: "Speed-style gauge preset." }),
  chart({ id: "stage-gauge", name: "Stage Gauge", label: "Stage Gauge", shortName: "STG", family: "gauge", preset: "stage", variantOf: "gauge", category: "advanced", group: "advanced", echartsSeriesType: "gauge", renderType: "gauge", description: "Stage/grade gauge preset." }),
  chart({ id: "barometer-gauge", name: "Barometer", label: "Barometer", shortName: "BARO", family: "gauge", preset: "barometer", variantOf: "gauge", category: "advanced", group: "advanced", echartsSeriesType: "gauge", renderType: "gauge", description: "Barometer-style gauge preset." }),
  chart({ id: "ring-gauge", name: "Ring Gauge", label: "Ring Gauge", shortName: "RG", family: "gauge", preset: "ring-gauge", variantOf: "progress-ring", category: "advanced", group: "advanced", echartsSeriesType: "pie", renderType: "progress-ring", description: "Gauge-style ring preset with a progress-ring preview.", advanced: true }),
  chart({ id: "calendar-heatmap", name: "Calendar Heatmap", label: "Calendar Heatmap", shortName: "CHM", family: "calendar", preset: "calendar-heatmap", variantOf: "calendar", category: "trend", group: "trend", echartsSeriesType: "heatmap", renderType: "calendar", description: "Calendar-based heatmap preset.", advanced: true }),
  chart({ id: "map-lines", name: "Map Lines", label: "Map Lines", shortName: "MPL", family: "lines", preset: "map-lines", variantOf: "lines", category: "flow", group: "flow", echartsSeriesType: "lines", renderType: "lines", description: "Route/path lines using the same safe preview path.", advanced: true }),
  chart({ id: "dataset-bar", name: "Dataset Bar", label: "Dataset Bar", shortName: "DSB", family: "dataset", preset: "bar", category: "custom", group: "custom", echartsSeriesType: "bar", renderType: "bar", description: "Dataset-driven bar preset with the same stable Builder mapping.", advanced: true, badges: ["Dataset"] }),
  chart({ id: "dataset-line", name: "Dataset Line", label: "Dataset Line", shortName: "DSL", family: "dataset", preset: "line", category: "custom", group: "custom", echartsSeriesType: "line", renderType: "line", description: "Dataset-driven line preset.", advanced: true, badges: ["Dataset"] }),
  chart({ id: "dataset-pie", name: "Dataset Pie", label: "Dataset Pie", shortName: "DSP", family: "dataset", preset: "pie", category: "custom", group: "custom", echartsSeriesType: "pie", renderType: "pie", description: "Dataset-driven pie preset.", advanced: true, badges: ["Dataset"] }),
  chart({ id: "dataset-matrix", name: "Dataset Matrix", label: "Dataset Matrix", shortName: "DSM", family: "dataset", preset: "matrix", category: "custom", group: "custom", echartsSeriesType: "heatmap", renderType: "matrix", description: "Dataset-driven matrix preset.", advanced: true, badges: ["Dataset"] }),
  chart({ id: "dataset-pivot", name: "Dataset Pivot", label: "Dataset Pivot", shortName: "DSPV", family: "dataset", preset: "pivot", category: "custom", group: "custom", echartsSeriesType: "table", renderType: "pivot-table", description: "Dataset-driven pivot preset.", advanced: true, badges: ["Dataset"] }),
  chart({ id: "datazoom-line", name: "Zoomable Line", label: "Zoomable Line", shortName: "DZL", family: "dataZoom", preset: "line", category: "advanced", group: "advanced", echartsSeriesType: "line", renderType: "line", description: "Line chart prepared for dataZoom enhancements.", advanced: true, badges: ["DataZoom"] }),
  chart({ id: "datazoom-bar", name: "Zoomable Bar", label: "Zoomable Bar", shortName: "DZB", family: "dataZoom", preset: "bar", category: "advanced", group: "advanced", echartsSeriesType: "bar", renderType: "bar", description: "Bar chart prepared for dataZoom interactions.", advanced: true, badges: ["DataZoom"] }),
  chart({ id: "graphic-line", name: "Annotated Line", label: "Annotated Line", shortName: "AGL", family: "graphic", preset: "line", category: "advanced", group: "advanced", echartsSeriesType: "line", renderType: "line", description: "Line chart prepared for graphic overlays and drag handles.", advanced: true, badges: ["Graphic"] }),
  chart({ id: "graphic-bar", name: "Annotated Bar", label: "Annotated Bar", shortName: "AGB", family: "graphic", preset: "bar", category: "advanced", group: "advanced", echartsSeriesType: "bar", renderType: "bar", description: "Bar chart prepared for graphic overlays.", advanced: true, badges: ["Graphic"] }),
  chart({ id: "rich-text-pie", name: "Rich Text Pie", label: "Rich Text Pie", shortName: "RTP", family: "pie", preset: "rich-text", variantOf: "pie", category: "advanced", group: "advanced", echartsSeriesType: "pie", renderType: "pie", description: "Pie family with rich-text label metadata.", advanced: true, badges: ["Rich Text"] }),
  chart({ id: "rich-text-donut", name: "Rich Text Donut", label: "Rich Text Donut", shortName: "RTD", family: "pie", preset: "rich-text", variantOf: "donut", category: "advanced", group: "advanced", echartsSeriesType: "pie", renderType: "donut", description: "Donut family with rich-text label metadata.", advanced: true, badges: ["Rich Text"] }),
  chart({ id: "rich-text-kpi", name: "Rich Text KPI", label: "Rich Text KPI", shortName: "RTK", family: "summary", preset: "rich-text", variantOf: "kpi", category: "advanced", group: "advanced", echartsSeriesType: "custom", renderType: "kpi", description: "KPI variant with rich-label metadata.", advanced: true, badges: ["Rich Text"] }),
  chart({ id: "custom-gantt", name: "Custom Gantt", label: "Custom Gantt", shortName: "CG", family: "custom", preset: "gantt", category: "custom", group: "custom", echartsSeriesType: "custom", renderType: "custom", description: "Custom-series gantt metadata with a safe timeline-style fallback.", advanced: true, experimental: true }),
  chart({ id: "globe-3d", name: "3D Globe", label: "3D Globe", shortName: "G3D", family: "gl", preset: "globe", category: "advanced", group: "advanced", echartsSeriesType: "custom", renderType: "map", description: "3D globe metadata hook preserved for future runtime support.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "bar-3d", name: "3D Bar", label: "3D Bar", shortName: "B3D", family: "gl", preset: "bar-3d", category: "advanced", group: "advanced", echartsSeriesType: "bar3D", renderType: "bar", description: "3D bar metadata hook preserved with a safe 2D fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "scatter-3d", name: "3D Scatter", label: "3D Scatter", shortName: "S3D", family: "gl", preset: "scatter-3d", category: "advanced", group: "advanced", echartsSeriesType: "scatter3D", renderType: "scatter", description: "3D scatter metadata hook preserved with a safe 2D fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "surface-3d", name: "3D Surface", label: "3D Surface", shortName: "SF3D", family: "gl", preset: "surface-3d", category: "advanced", group: "advanced", echartsSeriesType: "surface", renderType: "heatmap", description: "3D surface metadata hook preserved with a safe surface fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "map-3d", name: "3D Map", label: "3D Map", shortName: "M3D", family: "gl", preset: "map-3d", category: "advanced", group: "advanced", echartsSeriesType: "map3D", renderType: "map", description: "3D map metadata hook preserved with a safe map fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "lines-3d", name: "3D Lines", label: "3D Lines", shortName: "L3D", family: "gl", preset: "lines-3d", category: "advanced", group: "advanced", echartsSeriesType: "lines3D", renderType: "lines", description: "3D lines metadata hook preserved with a safe path fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["3D"] }),
  chart({ id: "scatter-gl", name: "ScatterGL", label: "ScatterGL", shortName: "SGL", family: "gl", preset: "scatter-gl", category: "advanced", group: "advanced", echartsSeriesType: "scatterGL", renderType: "scatter", description: "ScatterGL metadata hook preserved with a safe scatter fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["GL"] }),
  chart({ id: "lines-gl", name: "LinesGL", label: "LinesGL", shortName: "LGL", family: "gl", preset: "lines-gl", category: "advanced", group: "advanced", echartsSeriesType: "linesGL", renderType: "lines", description: "LinesGL metadata hook preserved with a safe lines fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["GL"] }),
  chart({ id: "flow-gl", name: "FlowGL", label: "FlowGL", shortName: "FGL", family: "gl", preset: "flow-gl", category: "advanced", group: "advanced", echartsSeriesType: "flowGL", renderType: "lines", description: "FlowGL metadata hook preserved with a safe flow fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["GL"] }),
  chart({ id: "graph-gl", name: "GraphGL", label: "GraphGL", shortName: "GGL", family: "gl", preset: "graph-gl", category: "advanced", group: "advanced", echartsSeriesType: "graphGL", renderType: "graph", description: "GraphGL metadata hook preserved with a safe graph fallback.", advanced: true, experimental: true, previewSupported: false, badges: ["GL"] }),
];

const SAMPLE_FALLBACK = { rows: [{ category: "North", value: 128 }, { category: "South", value: 92 }, { category: "West", value: 154 }], config: { x: "category", y: "value", title: "Sample chart" } };
const CHART_MAP = Object.fromEntries(CHART_DEFINITIONS.map((item) => [item.id, item]));
const SELECTOR_FAMILY_MAP = new Map(FAMILY_SELECTOR_CATALOG.map((family) => [family.id, family]));
const SELECTOR_VARIANT_MAP = new Map(
  FAMILY_SELECTOR_CATALOG.flatMap((family) =>
    (family.variants ?? []).map((variant) => [
      variant.id,
      {
        ...variant,
        familyId: family.id,
        familyLabel: family.label,
        categories: family.categories ?? [],
        primaryCategory: family.primaryCategory ?? family.categories?.[0] ?? "comparison",
      },
    ])
    )
);
const CHART_META_CACHE = new Map();

function selectorVariant(definition) {
  return {
    description: "",
    keywords: [],
    chartId: definition.chartId ?? definition.id,
    ...definition,
  };
}

function selectorFamily(definition) {
  const variants = (definition.variants ?? []).map((variantItem) => selectorVariant(variantItem));
  const categories = unique(definition.categories ?? [definition.category].filter(Boolean));

  return {
    description: "",
    keywords: [],
    categories,
    primaryCategory: categories[0] ?? "comparison",
    variants,
    chartIds: unique([...(definition.chartIds ?? []), ...variants.map((variantItem) => variantItem.chartId)]),
    ...definition,
    categories,
    primaryCategory: categories[0] ?? "comparison",
    variants,
    chartIds: unique([...(definition.chartIds ?? []), ...variants.map((variantItem) => variantItem.chartId)]),
  };
}

const CHART_SELECTOR_FAMILIES = [
  selectorFamily({
    id: "bar",
    label: "Bar",
    family: "bar",
    categories: ["comparison", "distribution"],
    description: "Compare categories with columns, stacks, rankings, and range bars.",
    keywords: ["column", "compare", "ranking"],
    variants: [
      { id: "basic-bar", label: "Basic Bar Chart", chartId: "bar", description: "Standard categorical comparison." },
      { id: "grouped-bar-variant", label: "Grouped Bar Chart", chartId: "grouped-bar", description: "Compare multiple series side by side." },
      { id: "stacked-column-bar", label: "Stacked Column Chart", chartId: "stacked-bar", description: "Show composition within totals." },
      { id: "stacked-horizontal-bar", label: "Stacked Horizontal Bar", chartId: "horizontal-bar", description: "Horizontal comparison for long labels." },
      { id: "bar-background-variant", label: "Bar with Background", chartId: "background-bar", description: "Track actual values against a full bar." },
      { id: "styled-single-bar", label: "Styled Single Bar", chartId: "styled-bar", description: "Presentation-ready single metric bar." },
      { id: "waterfall-bar", label: "Waterfall", chartId: "waterfall", description: "Cumulative gains and losses across steps." },
      { id: "negative-bar-variant", label: "Negative Bar", chartId: "negative-bar", description: "Show positive and negative bars cleanly." },
      { id: "mixed-line-plus-bar", label: "Mixed Line + Bar", chartId: "mixed-line-bar", description: "Blend bars with a companion trend." },
      { id: "large-scale-bar", label: "Large Scale Bar", chartId: "bar", description: "Stable preview for high-volume categorical bars." },
      { id: "bar-race-variant", label: "Bar Race", chartId: "bar-racing", description: "Time-based ranking bars." },
      { id: "sorted-bar-variant", label: "Sorted Bar", chartId: "sorted-bar", description: "Bar ordering optimized for rank reading." },
      { id: "dataset-bar-variant", label: "Dataset-based Bar", chartId: "dataset-bar", description: "Dataset encode-driven bar setup." },
      { id: "mini-bars-matrix", label: "Mini Bars in Matrix", chartId: "bar", description: "Compact matrix-style micro bars." },
    ],
  }),
  selectorFamily({
    id: "line",
    label: "Line",
    family: "line",
    categories: ["comparison", "trend"],
    description: "Track change, compare trends, and explore time-based patterns.",
    keywords: ["trend", "time series", "area"],
    variants: [
      { id: "basic-line", label: "Basic Line Chart", chartId: "line", description: "Standard single-series line chart." },
      { id: "smooth-line-variant", label: "Smoothed Line Chart", chartId: "smooth-line", description: "Curved line for smoother trend reading." },
      { id: "basic-area-chart", label: "Basic area chart", chartId: "area", description: "Filled area under a single trend line." },
      { id: "stacked-line-variant", label: "Stacked Line Chart", chartId: "stacked-line", description: "Layer multiple lines cumulatively." },
      { id: "stacked-area-variant", label: "Stacked Area Chart", chartId: "stacked-area", description: "Stacked filled areas across series." },
      { id: "gradient-stacked-area", label: "Gradient Stacked Area Chart", chartId: "stacked-area", description: "Stacked area with gradient styling." },
      { id: "bump-line", label: "Bump Chart (Ranking)", chartId: "multi-line", description: "Ranking change across periods." },
      { id: "temperature-week-line", label: "Temperature Change in the Coming Week", chartId: "line", description: "Forecast-style weekly line." },
      { id: "area-pieces", label: "Area Pieces", chartId: "area", description: "Segmented area regions across a line." },
      { id: "transform-filter-line", label: "Data Transform Filter", chartId: "line", description: "Filtered line example with transformed inputs." },
      { id: "line-gradient", label: "Line Gradient", chartId: "smooth-line", description: "Gradient stroke emphasis on a line." },
      { id: "electricity-distribution-line", label: "Distribution of Electricity", chartId: "multi-line", description: "Multi-series distribution over time." },
      { id: "large-area-line", label: "Large scale area chart", chartId: "area", description: "Area chart ready for larger datasets." },
      { id: "confidence-band", label: "Confidence Band", chartId: "area", description: "Trend with confidence shading." },
      { id: "rainfall-vs-evaporation-line", label: "Rainfall vs Evaporation", chartId: "multi-line", description: "Two-series weather comparison." },
      { id: "beijing-aqi-line", label: "Beijing AQI", chartId: "multi-line", description: "Air quality trends across multiple measures." },
      { id: "multiple-x-axes-line", label: "Multiple X Axes", chartId: "line", description: "Dual-x-axis line layout metadata." },
      { id: "rainfall-line", label: "Rainfall", chartId: "line", description: "Single-metric rainfall trend." },
      { id: "time-axis-area-line", label: "Area Chart with Time Axis", chartId: "area", description: "Area chart tuned for a time axis." },
      { id: "dynamic-time-axis-line", label: "Dynamic Data + Time Axis", chartId: "line", description: "Streaming or incrementally updating line." },
      { id: "function-plot-line", label: "Function Plot", chartId: "line", description: "Continuous function-style plotting." },
      { id: "line-race", label: "Line Race", chartId: "multi-line", description: "Animated rank or share line progression." },
      { id: "line-marklines", label: "Line with Marklines", chartId: "line", description: "Reference thresholds and markers on a line." },
      { id: "styled-line", label: "Line Style and Item Style", chartId: "line", description: "Line styling and symbol emphasis." },
      { id: "cartesian-line", label: "Line Chart in Cartesian Coordinate System", chartId: "line", description: "Classic cartesian line setup." },
      { id: "log-axis-line", label: "Log Axis", chartId: "line", description: "Logarithmic line axis example." },
      { id: "step-line-variant", label: "Step Line", chartId: "step-line", description: "Step-based transitions between points." },
      { id: "easing-line", label: "Line Easing Visualizing", chartId: "smooth-line", description: "Animated easing over a line series." },
      { id: "fisheye-line", label: "Fisheye Lens on Line Chart", chartId: "line", description: "Focus-plus-context line interaction." },
      { id: "line-y-category", label: "Line Y Category", chartId: "line", description: "Line chart with categorical Y axis." },
      { id: "graphic-line-example", label: "Custom Graphic Component", chartId: "line", description: "Line with graphic annotation concepts." },
      { id: "click-add-points-line", label: "Click to Add Points", chartId: "line", description: "Editable line point interactions." },
      { id: "polar-two-value-axes-line", label: "Two Value-Axes in Polar", chartId: "line", description: "Polar coordinate line metadata." },
      { id: "tooltip-datazoom-mobile-line", label: "Tooltip and DataZoom on Mobile", chartId: "line", description: "Touch-first tooltip and zoom behavior." },
      { id: "draggable-points-line", label: "Draggable Points", chartId: "line", description: "Interactive draggable line control points." },
      { id: "intraday-breaks-line", label: "Intraday Chart with Breaks", chartId: "line", description: "Trading-session breaks on a line." },
      { id: "intraday-breaks-2-line", label: "Intraday Chart with Breaks (II)", chartId: "line", description: "Alternate intraday break treatment." },
      { id: "dataset-share-line", label: "Share Dataset", chartId: "line", description: "Share a dataset across multiple line series." },
      { id: "matrix-sparkline", label: "Mini Line Charts (Sparkline) in Matrix", chartId: "line", description: "Compact sparkline-style line variant." },
    ],
  }),
  selectorFamily({
    id: "pie",
    label: "Pie",
    family: "pie",
    categories: ["distribution"],
    description: "Show part-to-whole composition with pies, donuts, and rose layouts.",
    variants: [
      { id: "standard-pie", label: "Standard Pie", chartId: "pie", description: "Classic pie chart." },
      { id: "doughnut-pie", label: "Doughnut", chartId: "donut", description: "Center-hole composition chart." },
      { id: "half-doughnut-pie", label: "Half Doughnut", chartId: "half-donut", description: "Half-ring composition view." },
      { id: "rose-pie", label: "Rose / Nightingale", chartId: "rose", description: "Radius-based rose chart." },
      { id: "scrollable-legend-pie", label: "Scrollable Legend Pie", chartId: "scrollable-pie", description: "Pie with larger legend handling." },
      { id: "special-label-pie-variant", label: "Special Label Pie", chartId: "special-label-pie", description: "Rich label layout around a pie." },
      { id: "nested-pie-variant", label: "Nested Pies", chartId: "nested-pie", description: "Nested composition rings." },
      { id: "rich-text-pie-variant", label: "Rich Text Pie", chartId: "rich-text-pie", description: "Advanced rich-text pie labels." },
    ],
  }),
  selectorFamily({
    id: "scatter",
    label: "Scatter",
    family: "scatter",
    categories: ["distribution", "relationship", "geo"],
    description: "Explore correlation, clustering, and multi-measure point distributions.",
    variants: [
      { id: "basic-scatter", label: "Basic Scatter", chartId: "scatter", description: "Two-measure scatter plot." },
      { id: "effect-scatter-variant", label: "Effect Scatter", chartId: "effect-scatter", description: "Ripple-highlighted scatter points." },
      { id: "bubble-scatter", label: "Bubble", chartId: "bubble", description: "Scatter with size as a third measure." },
      { id: "large-scatter-variant", label: "Large Scatter", chartId: "large-scatter", description: "Prepared for denser point sets." },
      { id: "geo-scatter-variant", label: "Geo Scatter", chartId: "geo-scatter", description: "Map-capable scatter points." },
      { id: "scatter-matrix", label: "Scatter Matrix", chartId: "scatter", description: "Matrix-style scatter comparisons." },
      { id: "calendar-scatter", label: "Calendar Scatter", chartId: "scatter", description: "Scatter marks inside a calendar layout." },
      { id: "regression-scatter", label: "Regression Scatter", chartId: "scatter", description: "Scatter plot prepared for regression overlays." },
    ],
  }),
  selectorFamily({
    id: "map",
    label: "GEO/Map",
    family: "map",
    categories: ["geo"],
    description: "Render choropleth, geo-scatter, and geo-network views.",
    variants: [
      { id: "choropleth-map", label: "Choropleth Map", chartId: "map", description: "Region-colored value map." },
      { id: "geo-map-variant", label: "Geo Map", chartId: "geo-map", description: "Geo component-based map preset." },
      { id: "geo-scatter-map", label: "Geo Scatter", chartId: "geo-scatter", description: "Scatter points on a map." },
      { id: "geo-graph-map", label: "Geo Graph", chartId: "geo-graph", description: "Network overlays on a geo layer." },
      { id: "svg-map-variant", label: "SVG Map", chartId: "map", description: "SVG-backed map metadata path." },
    ],
  }),
  selectorFamily({
    id: "candlestick",
    label: "Candlestick",
    family: "candlestick",
    categories: ["statistical"],
    description: "Financial OHLC and price-movement charts.",
    variants: [
      { id: "basic-candlestick", label: "Basic Candlestick", chartId: "candlestick", description: "Standard OHLC candle view." },
      { id: "ohlc-candlestick", label: "OHLC", chartId: "ohlc", description: "Open-high-low-close variant." },
      { id: "large-candlestick", label: "Large Scale Candlestick", chartId: "candlestick-large", description: "Prepared for larger financial datasets." },
      { id: "stock-intraday-candlestick", label: "Stock / Intraday", chartId: "candlestick", description: "Intraday stock-style candle layout." },
    ],
  }),
  selectorFamily({
    id: "radar",
    label: "Radar",
    family: "radar",
    categories: ["statistical"],
    description: "Compare profiles across multiple indicators in radial space.",
    variants: [
      { id: "basic-radar", label: "Basic Radar", chartId: "radar", description: "Single radar comparison." },
      { id: "multi-radar", label: "Multi Radar", chartId: "radar", description: "Compare several radar series." },
      { id: "aqi-radar", label: "AQI-style Radar", chartId: "radar", description: "Air-quality style radar metrics." },
      { id: "browser-radar", label: "Browser-style Radar", chartId: "radar", description: "Category score radar layout." },
    ],
  }),
  selectorFamily({
    id: "boxplot",
    label: "Boxplot",
    family: "boxplot",
    categories: ["distribution", "statistical"],
    description: "Summarize quartiles, spread, and outliers.",
    variants: [
      { id: "basic-boxplot", label: "Basic Boxplot", chartId: "boxplot", description: "Classic box-and-whisker plot." },
      { id: "aggregated-boxplot", label: "Aggregated Boxplot", chartId: "boxplot", description: "Precomputed quartile fields." },
      { id: "multi-category-boxplot", label: "Multi-category Boxplot", chartId: "boxplot", description: "Several categories of distributions." },
    ],
  }),
  selectorFamily({
    id: "heatmap",
    label: "Heatmap",
    family: "heatmap",
    categories: ["distribution", "statistical"],
    description: "Show density, correlation, or intensity in a grid.",
    variants: [
      { id: "cartesian-heatmap", label: "Cartesian Heatmap", chartId: "heatmap", description: "Grid heatmap on row and column axes." },
      { id: "large-heatmap", label: "Large Heatmap", chartId: "heatmap", description: "Prepared for denser heatmap cells." },
      { id: "discrete-color-heatmap", label: "Discrete Color Heatmap", chartId: "heatmap", description: "Heatmap with stepped color meaning." },
      { id: "calendar-heatmap-variant", label: "Calendar Heatmap", chartId: "calendar-heatmap", description: "Calendar-based heatmap layout." },
    ],
  }),
  selectorFamily({
    id: "graph",
    label: "Graph",
    family: "graph",
    categories: ["relationship"],
    description: "Render dependencies, networks, and connected nodes.",
    variants: [
      { id: "basic-graph", label: "Basic Graph", chartId: "graph", description: "Simple node-link graph." },
      { id: "force-graph-variant", label: "Force Graph", chartId: "force-graph", description: "Force-directed network layout." },
      { id: "dependency-graph-variant", label: "Dependency Graph", chartId: "dependency-graph", description: "Directed dependency relationships." },
      { id: "dynamic-graph", label: "Dynamic Graph", chartId: "graph", description: "Graph layout prepared for live updates." },
    ],
  }),
  selectorFamily({
    id: "lines",
    label: "Lines",
    family: "lines",
    categories: ["flow", "geo"],
    description: "Show paths, routes, and directional movement between points.",
    variants: [
      { id: "geo-lines", label: "Geo / Map Lines", chartId: "lines", description: "Flow lines across geographies." },
      { id: "route-lines", label: "Route / Path Lines", chartId: "map-lines", description: "Path-like or route-based lines." },
      { id: "animated-lines", label: "Animated Lines", chartId: "lines", description: "Flow animation metadata on lines." },
    ],
  }),
  selectorFamily({
    id: "tree",
    label: "Tree",
    family: "tree",
    categories: ["hierarchy"],
    description: "Show parent-child structures with directional tree layouts.",
    variants: [
      { id: "top-bottom-tree", label: "Top-Bottom Tree", chartId: "tree", description: "Standard top-down hierarchy." },
      { id: "left-right-tree-variant", label: "Left-Right Tree", chartId: "left-right-tree", description: "Horizontal tree orientation." },
      { id: "radial-tree-variant", label: "Radial Tree", chartId: "radial-tree", description: "Circular tree layout." },
      { id: "polyline-tree", label: "Polyline Tree", chartId: "tree", description: "Tree with polyline connectors." },
    ],
  }),
  selectorFamily({
    id: "treemap",
    label: "Treemap",
    family: "treemap",
    categories: ["hierarchy"],
    description: "Nested rectangles for hierarchical part-to-whole analysis.",
    variants: [
      { id: "basic-treemap-variant", label: "Basic Treemap", chartId: "treemap", description: "Standard treemap." },
      { id: "gradient-treemap-variant", label: "Gradient Treemap", chartId: "gradient-treemap", description: "Treemap with gradient emphasis." },
      { id: "parent-label-treemap", label: "Parent Label Treemap", chartId: "treemap", description: "Treemap with parent labeling emphasis." },
    ],
  }),
  selectorFamily({
    id: "sunburst",
    label: "Sunburst",
    family: "sunburst",
    categories: ["hierarchy"],
    description: "Hierarchical rings for nested composition.",
    variants: [
      { id: "basic-sunburst", label: "Basic Sunburst", chartId: "sunburst", description: "Standard hierarchical sunburst." },
      { id: "rounded-sunburst-variant", label: "Rounded Corner Sunburst", chartId: "rounded-sunburst", description: "Rounded arc styling." },
      { id: "rotated-label-sunburst", label: "Rotated Label Sunburst", chartId: "sunburst", description: "Readable rotated sunburst labels." },
      { id: "monochrome-sunburst", label: "Monochrome Sunburst", chartId: "sunburst", description: "Single-tone hierarchy emphasis." },
    ],
  }),
  selectorFamily({
    id: "parallel",
    label: "Parallel",
    family: "parallel",
    categories: ["statistical"],
    description: "Compare many numeric dimensions per row.",
    variants: [
      { id: "basic-parallel", label: "Basic Parallel", chartId: "parallel", description: "Parallel coordinates for numeric dimensions." },
      { id: "aqi-parallel", label: "AQI-style Parallel", chartId: "parallel", description: "Air-quality metric comparison." },
      { id: "nutrients-parallel", label: "Nutrients-style Parallel", chartId: "parallel", description: "Multiple nutrient measures per row." },
    ],
  }),
  selectorFamily({
    id: "sankey",
    label: "Sankey",
    family: "sankey",
    categories: ["flow"],
    description: "Visualize movement and volume between stages or nodes.",
    variants: [
      { id: "basic-sankey", label: "Basic Sankey", chartId: "sankey", description: "Standard left-to-right sankey." },
      { id: "vertical-sankey-variant", label: "Vertical Sankey", chartId: "vertical-sankey", description: "Vertical sankey orientation." },
      { id: "gradient-sankey-variant", label: "Gradient-edge Sankey", chartId: "gradient-sankey", description: "Gradient edge styling." },
      { id: "level-sankey", label: "Level-configurable Sankey", chartId: "sankey", description: "Configure node levels and spacing." },
    ],
  }),
  selectorFamily({
    id: "funnel",
    label: "Funnel",
    family: "funnel",
    categories: ["flow"],
    description: "Show ordered stage drop-off or conversion.",
    variants: [
      { id: "basic-funnel", label: "Funnel", chartId: "funnel", description: "Standard stage funnel." },
      { id: "compare-funnel", label: "Compare Funnel", chartId: "funnel", description: "Comparison-oriented funnel arrangement." },
      { id: "custom-funnel", label: "Custom Funnel", chartId: "funnel", description: "Custom-styled funnel presentation." },
    ],
  }),
  selectorFamily({
    id: "gauge",
    label: "Gauge",
    family: "gauge",
    categories: ["comparison", "advanced"],
    description: "Single-metric dials, rings, and status gauges.",
    variants: [
      { id: "basic-gauge", label: "Basic Gauge", chartId: "gauge", description: "Classic gauge dial." },
      { id: "simple-gauge-variant", label: "Simple Gauge", chartId: "simple-gauge", description: "Minimal dial treatment." },
      { id: "speed-gauge-variant", label: "Speed Gauge", chartId: "speed-gauge", description: "Speedometer-style metric dial." },
      { id: "progress-ring-variant", label: "Progress Gauge", chartId: "progress-ring", description: "Radial progress ring." },
      { id: "stage-gauge-variant", label: "Stage Gauge", chartId: "stage-gauge", description: "Grade or stage threshold gauge." },
      { id: "barometer-gauge-variant", label: "Barometer", chartId: "barometer-gauge", description: "Barometer-style pressure gauge." },
      { id: "ring-gauge-variant", label: "Ring Gauge", chartId: "ring-gauge", description: "Circular ring treatment for a KPI." },
    ],
  }),
  selectorFamily({
    id: "pictorialBar",
    label: "PictorialBar",
    family: "pictorialBar",
    categories: ["comparison"],
    description: "Use icons or shapes instead of plain rectangles.",
    variants: [
      { id: "basic-pictorial-bar", label: "Pictorial Bar", chartId: "pictorial-bar", description: "Shape-based bar chart." },
      { id: "dotted-pictorial-bar", label: "Dotted Bar", chartId: "pictorial-bar", description: "Repeated symbols for bar fill." },
      { id: "icon-pictorial-bar", label: "Icon Bar", chartId: "pictorial-bar", description: "Icon-driven comparison chart." },
    ],
  }),
  selectorFamily({
    id: "themeRiver",
    label: "ThemeRiver",
    family: "themeRiver",
    categories: ["trend", "flow"],
    description: "Layered streams over time for thematic movement.",
    variants: [
      { id: "basic-themeriver", label: "Standard ThemeRiver", chartId: "theme-river", description: "Multi-series theme river." },
      { id: "multi-series-themeriver", label: "Multi-series ThemeRiver", chartId: "theme-river", description: "Multiple themes over time." },
    ],
  }),
  selectorFamily({
    id: "calendar",
    label: "Calendar",
    family: "calendar",
    categories: ["trend"],
    description: "Place values on dates inside a calendar grid.",
    variants: [
      { id: "simple-calendar", label: "Simple Calendar", chartId: "calendar", description: "Date-based calendar chart." },
      { id: "calendar-heatmap-family", label: "Calendar Heatmap", chartId: "calendar-heatmap", description: "Heatmap values on calendar cells." },
      { id: "calendar-graph", label: "Calendar Graph", chartId: "calendar", description: "Calendar layout prepared for graph overlays." },
      { id: "calendar-pie", label: "Calendar Pie", chartId: "calendar", description: "Calendar layout prepared for pie overlays." },
    ],
  }),
  selectorFamily({
    id: "matrix",
    label: "Matrix",
    family: "matrix",
    categories: ["advanced"],
    description: "Grid-style analytical layouts for rows, columns, and measures.",
    variants: [
      { id: "simple-matrix", label: "Simple Matrix", chartId: "matrix", description: "Basic matrix/grid comparison." },
      { id: "correlation-matrix", label: "Correlation Matrix Heatmap", chartId: "matrix", description: "Heatmap for correlation-like values." },
      { id: "confusion-matrix", label: "Confusion Matrix", chartId: "matrix", description: "Classification-style matrix layout." },
      { id: "mini-line-matrix", label: "Mini Line Matrix", chartId: "matrix", description: "Matrix layout with sparkline concepts." },
      { id: "mini-bar-matrix", label: "Mini Bar Matrix", chartId: "matrix", description: "Matrix layout with compact bars." },
    ],
  }),
  selectorFamily({
    id: "chord",
    label: "Chord",
    family: "chord",
    categories: ["relationship"],
    description: "Circular relationship view for directional connectivity.",
    variants: [
      { id: "basic-chord", label: "Basic Chord", chartId: "chord", description: "Circular relationship diagram." },
      { id: "min-angle-chord", label: "Chord with MinAngle", chartId: "chord", description: "Minimum-angle chord spacing." },
      { id: "line-style-chord", label: "Chord LineStyle Color", chartId: "chord", description: "Chord with line-style color emphasis." },
    ],
  }),
  selectorFamily({
    id: "custom",
    label: "Custom",
    family: "custom",
    categories: ["advanced", "custom"],
    description: "Custom-series concepts and bespoke analytic visuals.",
    variants: [
      { id: "histogram-custom", label: "Histogram Custom", chartId: "histogram", description: "Custom histogram-style chart." },
      { id: "custom-series", label: "Custom Series", chartId: "custom", description: "General custom-series architecture." },
      { id: "error-bar-custom", label: "Error Bar", chartId: "custom", description: "Custom error-bar style rendering." },
      { id: "gantt-custom", label: "Gantt", chartId: "custom-gantt", description: "Task timeline via custom rendering." },
      { id: "flame-graph-custom", label: "Flame Graph", chartId: "custom", description: "Hierarchy-like flame graph concept." },
    ],
  }),
  selectorFamily({
    id: "dataset",
    label: "Dataset",
    family: "dataset",
    categories: ["advanced"],
    description: "Dataset-first charting with reusable encodes and layouts.",
    variants: [
      { id: "dataset-simple-encode", label: "Simple Encode", chartId: "dataset-bar", description: "Dataset encode with a bar chart." },
      { id: "dataset-share", label: "Share Dataset", chartId: "dataset-line", description: "Reuse one dataset across views." },
      { id: "dataset-object-array", label: "Object-array Dataset", chartId: "dataset-pie", description: "Object-array dataset example." },
      { id: "dataset-matrix-variant", label: "Encode and Matrix", chartId: "dataset-matrix", description: "Dataset-driven matrix setup." },
      { id: "dataset-pivot-variant", label: "Series Layout by Row/Column", chartId: "dataset-pivot", description: "Pivoted dataset layout." },
    ],
  }),
  selectorFamily({
    id: "dataZoom",
    label: "DataZoom",
    family: "dataZoom",
    categories: ["trend", "advanced"],
    description: "Interactive zooming and mobile-friendly large-scale charts.",
    variants: [
      { id: "zoomable-line", label: "Zoomable Line", chartId: "datazoom-line", description: "Line chart with data zoom behavior." },
      { id: "zoomable-bar", label: "Zoomable Bar", chartId: "datazoom-bar", description: "Bar chart with data zoom behavior." },
      { id: "mobile-tooltip-datazoom", label: "Mobile Tooltip + DataZoom", chartId: "datazoom-line", description: "Touch-friendly zoom and tooltip." },
    ],
  }),
  selectorFamily({
    id: "graphic",
    label: "Graphic",
    family: "graphic",
    categories: ["advanced", "custom"],
    description: "Graphic overlays, annotation layers, and interaction affordances.",
    variants: [
      { id: "annotated-line-graphic", label: "Custom Graphic Component", chartId: "graphic-line", description: "Graphic overlay on a line chart." },
      { id: "annotated-bar-graphic", label: "Graphic Bar", chartId: "graphic-bar", description: "Graphic overlay on a bar chart." },
      { id: "draggable-points-graphic", label: "Draggable Points", chartId: "graphic-line", description: "Drag handles and interactive marks." },
      { id: "stroke-animation-graphic", label: "Stroke Animation", chartId: "graphic-line", description: "Graphic stroke animation metadata." },
    ],
  }),
  selectorFamily({
    id: "richText",
    label: "Rich Text",
    family: "richText",
    categories: ["advanced", "custom"],
    description: "Text-driven chart styling with richer labels and callouts.",
    variants: [
      { id: "special-label-rich-text", label: "Pie Special Label", chartId: "special-label-pie", description: "Rich text labels around a pie." },
      { id: "rich-text-pie-family", label: "Rich Text Pie", chartId: "rich-text-pie", description: "Pie with advanced label formatting." },
      { id: "rich-text-donut-family", label: "Rich Text Donut", chartId: "rich-text-donut", description: "Donut with rich text labels." },
      { id: "weather-statistics-rich-text", label: "Weather Statistics Labels", chartId: "rich-text-kpi", description: "Rich stat labels and summaries." },
    ],
  }),
];

function createDefaultConfig(type) {
  return {
    chartType: type,
    legendVisible: !["gauge", "progress-ring", "kpi", "table", "pivot-table", "calendar"].includes(type),
    showGrid: !["pie", "donut", "rose", "gauge", "progress-ring", "treemap", "sunburst", "tree", "sankey", "graph", "map", "calendar"].includes(type),
    showLabels: ["pie", "donut", "rose", "funnel", "gauge", "progress-ring", "treemap", "sunburst", "calendar-heatmap"].includes(type),
    smooth: type === "smooth-line",
    colorTheme: "default",
  };
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getFieldType(tableFields = [], fieldName) {
  return tableFields.find((field) => field.name === fieldName)?.type ?? null;
}

function createMetaDefaultConfig(chartMeta) {
  return {
    ...createDefaultConfig(chartMeta.id),
    ...(chartMeta.defaultConfig ?? {}),
    chartType: chartMeta.id,
  };
}

function createConfigSnapshot(config = {}) {
  return {
    chartType: config.chartType ?? config.chartTypeId ?? config.variant ?? config.type ?? "bar",
    x: config.x ?? config.mappings?.x ?? config.xField ?? null,
    y: config.y ?? config.mappings?.y ?? config.yField ?? null,
    groupBy: config.groupBy ?? config.mappings?.groupBy ?? config.groupField ?? null,
    sizeField: config.sizeField ?? config.mappings?.sizeField ?? config.size ?? config.sizeBy ?? null,
    xType: config.xType ?? config.mappings?.xType ?? null,
    yType: config.yType ?? config.mappings?.yType ?? null,
    sizeType: config.sizeType ?? config.mappings?.sizeType ?? null,
  };
}

function buildSlotsForChart(chartMeta, requirements) {
  const slots = [];
  const seen = new Set();
  requirements.roles.forEach((role) => {
    (role.slotBindings ?? []).forEach((slotKey) => {
      if (seen.has(slotKey)) return;
      seen.add(slotKey);
      slots.push({
        key: slotKey,
        label: role.label,
        role: role.key,
        required: role.required,
        helper: role.emptyHint,
        description: role.description,
        acceptedTypes: role.acceptedTypes,
      });
    });
  });

  if (!slots.length) {
    slots.push({ key: "x", label: "Category", role: "category", required: false, helper: "Add a field", description: chartMeta.description, acceptedTypes: FIELD_ROLES.category.acceptedTypes });
  }

  return slots;
}

function normalizeChartMeta(chartMeta) {
  const cached = CHART_META_CACHE.get(chartMeta.id);
  if (cached) return cached;

  const requirements = getChartRequirements(chartMeta.id);
  const slots = buildSlotsForChart(chartMeta, requirements);
  const defaultConfig = createMetaDefaultConfig(chartMeta);

  const normalized = {
    ...chartMeta,
    type: chartMeta.renderType,
    icon: chartMeta.shortName,
    outputKind: "echarts",
    defaultConfig,
    slots,
    requiredFields: requirements.requiredFields,
    optionalFields: requirements.optionalFields,
    allowedFieldTypes: requirements.allowedFieldTypes,
    minFields: requirements.minFields,
    maxFields: requirements.maxFields,
    minimumRoleCount: requirements.minimumRoleCount,
    minimumRequiredFields: requirements.minFields,
    supportedMappings: requirements.roles.map((role) => role.key),
    stability: chartMeta.experimental ? "experimental" : chartMeta.advanced ? "advanced" : "stable",
    requirements,
    compatibilityTags: unique([chartMeta.family, chartMeta.category, ...requirements.roles.map((role) => role.key)]),
  };

  CHART_META_CACHE.set(chartMeta.id, normalized);
  return normalized;
}

function createVariantChartMeta(type) {
  const variant = SELECTOR_VARIANT_MAP.get(type);
  if (!variant) return null;

  const baseChart = CHART_MAP[variant.chartId] ?? CHART_MAP.bar;
  const family = SELECTOR_FAMILY_MAP.get(variant.familyId);
  const supportLevel = variant.supportLevel ?? "supported";
  const variantBadges = [];

  if (supportLevel === "partial") variantBadges.push("Partial");
  if (supportLevel === "metadata-ready") variantBadges.push("Metadata");

  return normalizeChartMeta({
    ...baseChart,
    id: variant.id,
    name: variant.label,
    label: variant.label,
    family: family?.id ?? baseChart.family,
    category: variant.primaryCategory ?? family?.primaryCategory ?? baseChart.category,
    group: variant.primaryCategory ?? family?.primaryCategory ?? baseChart.group,
    description: variant.description || baseChart.description,
    keywords: unique([...(baseChart.keywords ?? []), ...(variant.keywords ?? [])]),
    badges: unique([...(baseChart.badges ?? []), ...variantBadges]),
    recommended: Boolean(baseChart.recommended || variant.recommended),
    chartId: variant.chartId,
    variantId: variant.id,
    selectorFamilyId: family?.id ?? null,
    selectorFamilyLabel: family?.label ?? null,
    supportLevel,
    requiredRoles: variant.requiredRoles ?? [],
    optionalRoles: variant.optionalRoles ?? [],
    renderingStrategy: variant.renderingStrategy ?? baseChart.renderType,
    previewSupported:
      supportLevel === "metadata-ready"
        ? baseChart.previewSupported !== false
        : baseChart.previewSupported,
    supported: baseChart.supported !== false,
    renderType: baseChart.renderType,
    defaultConfig: {
      ...baseChart.defaultConfig,
      chartType: variant.id,
      selectedChartFamily: family?.id ?? null,
      selectedChartVariant: variant.id,
      selectedChartBaseType: baseChart.id,
    },
  });
}

function pushUnique(target, values = []) {
  values.forEach((value) => {
    if (value && !target.includes(value)) target.push(value);
  });
}

function recommendFromState(builderState = {}, tableFields = []) {
  const normalized = createConfigSnapshot(builderState);
  const xType = normalized.xType ?? getFieldType(tableFields, normalized.x);
  const yType = normalized.yType ?? getFieldType(tableFields, normalized.y);
  const sizeType = normalized.sizeType ?? getFieldType(tableFields, normalized.sizeField);
  const hasSeries = Boolean(normalized.groupBy);
  const recommendations = [];

  if (!normalized.x && yType === "number") {
    pushUnique(recommendations, ["kpi", "gauge", "progress-ring"]);
  } else if (xType === "number" && yType === "number") {
    pushUnique(recommendations, sizeType === "number" ? ["bubble", "effect-scatter", "scatter"] : ["scatter", "effect-scatter", "bubble"]);
  } else if (xType === "date" && yType === "number") {
    pushUnique(recommendations, hasSeries ? ["line", "smooth-line", "area", "stacked-line", "stacked-area", "multi-line", "calendar"] : ["line", "smooth-line", "area", "step-line", "calendar"]);
  } else if (xType && yType === "number") {
    pushUnique(recommendations, ["bar", "horizontal-bar", "line", "pictorial-bar"]);
    if (hasSeries) pushUnique(recommendations, ["grouped-bar", "stacked-bar", "multi-line", "radar", "heatmap", "matrix"]);
    if (xType !== "date") pushUnique(recommendations, ["pie", "donut", "rose", "funnel"]);
  } else if (!normalized.y && xType === "number") {
    pushUnique(recommendations, ["histogram", "kpi"]);
  } else if (normalized.x && normalized.groupBy && yType === "number") {
    pushUnique(recommendations, ["heatmap", "treemap", "sunburst", "pivot-table"]);
  } else {
    pushUnique(recommendations, ["bar", "line", "table"]);
  }

  if (normalized.chartType) pushUnique(recommendations, [normalized.chartType]);
  return recommendations;
}

export function getBuilderChartCatalog({ includeHidden = false } = {}) {
  return CHART_DEFINITIONS.filter((item) => includeHidden || !item.hidden).map((item) => normalizeChartMeta(item));
}

export function getChartSelectorCategories() {
  return CHART_CATEGORIES.filter(
    (category) =>
      category.id !== "recommended" &&
      FAMILY_SELECTOR_CATALOG.some((family) => family.categories.includes(category.id))
  );
}

export function getChartSelectorFamilies(categoryId = null) {
  return FAMILY_SELECTOR_CATALOG.filter((family) => !categoryId || family.categories.includes(categoryId)).map((family) => ({
    ...family,
    primaryCategory: family.primaryCategory ?? family.categories?.[0] ?? "comparison",
  }));
}

export function getChartFamilyMeta(familyId) {
  const family = FAMILY_SELECTOR_CATALOG.find((item) => item.id === familyId) ?? FAMILY_SELECTOR_CATALOG[0];
  return family
    ? {
        ...family,
        primaryCategory: family.primaryCategory ?? family.categories?.[0] ?? "comparison",
      }
    : null;
}

export function getChartVariantsForFamily(familyId) {
  return getChartFamilyMeta(familyId)?.variants ?? [];
}

export function getChartSelectorDefaults(chartType) {
  const family =
    FAMILY_SELECTOR_CATALOG.find((familyItem) =>
      familyItem.variants.some((variant) => variant.chartId === chartType || variant.id === chartType)
    ) ?? FAMILY_SELECTOR_CATALOG[0];
  const variant =
    family?.variants.find((variantItem) => variantItem.chartId === chartType || variantItem.id === chartType) ??
    family?.variants?.[0] ??
    null;

  return {
    categoryId: family?.primaryCategory ?? family?.categories?.[0] ?? "comparison",
    familyId: family?.id ?? "bar",
    variantId: variant?.id ?? null,
  };
}

export function getChartCategories() {
  const catalog = getBuilderChartCatalog();
  return CHART_CATEGORIES.filter((category) => category.id === "recommended" || catalog.some((chartMeta) => chartMeta.category === category.id));
}

export function getChartsByCategory(category) {
  return getBuilderChartCatalog().filter((item) => item.category === category);
}

export function getChartMeta(type) {
  return createVariantChartMeta(type) ?? normalizeChartMeta(CHART_MAP[type] ?? CHART_MAP.bar);
}

export function getChartVariantMeta(variantId) {
  return SELECTOR_VARIANT_MAP.get(variantId) ?? null;
}

export function resolveChartRuntimeType(chartType) {
  const variant = getChartVariantMeta(chartType);
  return variant?.chartId ?? chartType;
}

export function getSupportedCharts() {
  return getBuilderChartCatalog().filter((item) => item.supported);
}

export function getChartTypeLabel(type) {
  return getChartMeta(type).name;
}

export function getRequiredFieldsForType(type) {
  return getChartMeta(type).requiredFields;
}

export function getOptionalFieldsForType(type) {
  return getChartMeta(type).optionalFields;
}

export function getCompatibleFieldMapping(type) {
  return getChartMeta(type).requirements.roles.map((role) => ({
    key: role.key,
    label: role.label,
    role: role.key,
    required: role.required,
    acceptedTypes: role.acceptedTypes,
    min: role.min,
    max: role.max,
  }));
}

export function getDefaultConfigForType(type, prevConfig = {}) {
  const meta = getChartMeta(type);
  return {
    ...prevConfig,
    ...createDefaultConfig(type),
    ...(meta.defaultConfig ?? {}),
    chartType: type,
  };
}

export function getRecommendedCharts(builderState = {}, tableFields = []) {
  return recommendFromState(builderState, tableFields).map((id) => getChartMeta(id));
}

export function getChartPreviewSeed(chartId) {
  const meta = getChartMeta(chartId);
  const sample = meta.previewSample ?? SAMPLE_FALLBACK;

  return {
    rows: sample.rows,
    config: {
      ...meta.defaultConfig,
      ...sample.config,
      chartType: chartId,
      title: sample.config?.title ?? "",
      subtitle: "",
    },
  };
}

export function switchBuilderChartType(nextType, currentConfig = {}) {
  return { nextConfig: getDefaultConfigForType(nextType, currentConfig), meta: getChartMeta(nextType) };
}

export function preserveCompatibleFields(nextType, currentConfig = {}) {
  return getDefaultConfigForType(nextType, currentConfig);
}

export function normalizeMappingForChartType(nextType, currentConfig = {}) {
  return getDefaultConfigForType(nextType, currentConfig);
}
