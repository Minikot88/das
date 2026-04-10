export const candlestickCharts = { id: "candlestick", label: "Candlestick", iconKey: "candlestick", categories: ["statistical"], description: "OHLC financial charting.", variants: [
  { id: "basic-candlestick", label: "Basic Candlestick", description: "Standard OHLC candles.", family: "candlestick", exampleKey: "basic-candlestick", chartId: "candlestick", requiredRoles: ["time","open","close","low","high"], optionalRoles: [], renderingStrategy: "candlestick", supportLevel: "supported" },
  { id: "ohlc", label: "OHLC", description: "Open-high-low-close variant.", family: "candlestick", exampleKey: "ohlc", chartId: "ohlc", requiredRoles: ["time","open","close","low","high"], optionalRoles: [], renderingStrategy: "candlestick", supportLevel: "supported" },
  { id: "large-scale-candlestick", label: "Large Scale Candlestick", description: "Prepared for larger financial datasets.", family: "candlestick", exampleKey: "large-scale-candlestick", chartId: "candlestick-large", requiredRoles: ["time","open","close","low","high"], optionalRoles: [], renderingStrategy: "candlestick", supportLevel: "partial" }
] };
export default candlestickCharts;
