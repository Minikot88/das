import { demoDataFields, demoDatasources, demoRows, type DemoDatasource, type DemoDatasetRow } from "../data/demoDataset";
import type { DataField } from "../types";

export type DatasetSchema = {
  datasourceId: string;
  datasetId: string;
  database: string;
  schema: string;
  table: string;
  fields: DataField[];
};

function cloneRow(row: DemoDatasetRow): DemoDatasetRow {
  return { ...row };
}

export function getDatasources(): DemoDatasource[] {
  return demoDatasources.map((datasource) => ({ ...datasource }));
}

export function getDatasetSchema(datasourceId: string): DatasetSchema {
  const datasource = demoDatasources.find((item) => item.id === datasourceId) ?? demoDatasources[0];
  return {
    datasourceId: datasource.id,
    datasetId: datasource.table,
    database: datasource.database,
    schema: datasource.schema,
    table: datasource.table,
    fields: demoDataFields.map((field) => ({ ...field, sampleValues: [...field.sampleValues] })),
  };
}

export function getDatasetRows(_datasetId: string): DemoDatasetRow[] {
  return demoRows.map(cloneRow);
}

export function refreshDataset(datasetId: string): DemoDatasetRow[] {
  return getDatasetRows(datasetId);
}

export function getDistinctFieldValues(rows: DemoDatasetRow[], fieldId: string) {
  return Array.from(new Set(rows.map((row) => String(row[fieldId] ?? "")))).sort((a, b) => a.localeCompare(b, "th"));
}

export type { DemoDatasource, DemoDatasetRow };
