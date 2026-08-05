function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function dashboardChartType(value) {
  const normalized = String(value || "bar").toLowerCase().replace(/^chart-type-/, "");
  return normalized === "doughnut" ? "donut" : normalized;
}

export function buildSavedChartConfigInput(savedChart = {}) {
  const config = asObject(savedChart.config);
  const dataContract = asObject(savedChart.dataContract);
  const mapping = asObject(savedChart.mapping);
  const datasetId = dataContract.datasetId ?? savedChart.datasetId ?? config.datasetId ?? null;

  return {
    ...config,
    chartType: dashboardChartType(savedChart.chartType ?? savedChart.type ?? config.chartType ?? config.type),
    mapping: Object.keys(mapping).length ? mapping : asObject(config.mapping),
    mappings: Object.keys(mapping).length ? mapping : config.mappings,
    settings: Object.keys(asObject(savedChart.settings)).length ? savedChart.settings : config.settings,
    sourceType: dataContract.sourceType ?? config.sourceType ?? (datasetId ? "dataset" : "unknown"),
    datasetId,
    updatedAt: savedChart.updatedAt ?? config.updatedAt,
  };
}

export function savedChartSourceDiffers(copiedConfig, savedConfig) {
  if (!copiedConfig || !savedConfig) return true;
  return copiedConfig.datasetId !== savedConfig.datasetId
    || copiedConfig.sourceType !== savedConfig.sourceType;
}

export function chartLibraryAfterAdd(mockMode, currentCharts, readLocalCharts) {
  return mockMode ? readLocalCharts() : currentCharts;
}
