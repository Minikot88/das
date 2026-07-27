function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Converts the immutable API snapshot into the chart-card model used by the
 * read-only dashboard. The API retains its database-shaped JSON fields, while
 * the renderer expects a flat presentation model.
 */
export function normalizeServerShareWidgets(widgets = []) {
  return (Array.isArray(widgets) ? widgets : []).map((widget) => {
    const source = asObject(widget);
    const chart = asObject(source.chart);
    if (!Object.keys(chart).length && source.type && source.type !== "chart") {
      return { ...source, config: asObject(source.config) };
    }
    const config = asObject(chart.config ?? chart.configJson);
    const dataContract = asObject(chart.dataContract ?? chart.dataContractJson);
    const mapping = asObject(chart.mapping ?? chart.mappingJson);
    const settings = asObject(chart.settings ?? chart.settingsJson);
    const configMappings = asArray(config.mappings ?? config.fieldMappings);
    const mappingSlots = asArray(mapping.mappings ?? mapping.fieldMappings);
    const rows = Array.isArray(dataContract.rows)
      ? dataContract.rows
      : Array.isArray(config.rows)
        ? config.rows
        : [];
    const chartType = asText(chart.type ?? chart.chartType ?? config.chartType ?? config.type, "bar");
    const datasetId = chart.datasetId ?? dataContract.datasetId ?? null;

    return {
      ...source,
      title: asText(source.title ?? chart.title ?? chart.name, "Chart"),
      type: chartType,
      engine: asText(chart.engine, "chartjs"),
      dataset: typeof datasetId === "string" && datasetId ? datasetId : "Shared snapshot",
      mapping,
      settings,
      dataContract,
      fields: asArray(dataContract.fields),
      rows,
      data: rows,
      config: {
        ...config,
        chartType,
        mappings: configMappings.length ? configMappings : mappingSlots,
        filters: asObject(chart.filters ?? chart.filtersJson ?? config.filters),
        rows,
      },
    };
  });
}
