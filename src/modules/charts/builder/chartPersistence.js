export function createVisualDatasetContract({ dataset, schema, queryMode }) {
  if (queryMode === "sql" || !dataset?.id) return undefined;
  return {
    sourceType: "dataset",
    datasetId: dataset.id,
    fields: Array.isArray(schema?.fields) ? schema.fields : [],
    rows: [],
  };
}
