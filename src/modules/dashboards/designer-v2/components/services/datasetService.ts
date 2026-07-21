import { workspaceRepository } from "@domain/workspace/workspaceRepository";
import { demoDataFields, demoDatasources, demoRows, type DemoDatasource, type DemoDatasetRow } from "@modules/dashboards/designer-v2/components/data/demoDataset";
import type { Aggregation, DataField, FieldType, SemanticType } from "@modules/dashboards/designer-v2/components/types";

type WorkspaceField = {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
};

type WorkspaceDataset = {
  id: string;
  projectId: string;
  name: string;
  fields: WorkspaceField[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  columnCount: number;
  updatedAt?: string;
};

type WorkspaceProject = {
  id: string;
  datasets: WorkspaceDataset[];
};

type WorkspaceLike = {
  active?: { projectId?: string | null };
  projects?: WorkspaceProject[];
};

export type DesignerDatasource = DemoDatasource & {
  sourceType: "demo" | "local";
  projectId?: string;
};

export type DatasetSchema = {
  available: boolean;
  message?: string;
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

function workspaceSnapshot(snapshot?: WorkspaceLike): WorkspaceLike {
  if (snapshot) return snapshot;
  if (workspaceRepository.getStatus().mode === "uninitialized") workspaceRepository.migrateIfNeeded();
  return workspaceRepository.getSnapshot() as WorkspaceLike;
}

function activeProject(snapshot?: WorkspaceLike): WorkspaceProject | null {
  const workspace = workspaceSnapshot(snapshot);
  const projects = Array.isArray(workspace.projects) ? workspace.projects : [];
  return projects.find((project) => project.id === workspace.active?.projectId) ?? projects[0] ?? null;
}

function canonicalDataset(datasetId: string, snapshot?: WorkspaceLike): WorkspaceDataset | null {
  return activeProject(snapshot)?.datasets?.find((dataset) => dataset.id === datasetId) ?? null;
}

function demoDatasource(datasetId: string): DemoDatasource | null {
  return demoDatasources.find((datasource) => datasource.id === datasetId || datasource.table === datasetId) ?? null;
}

function cloneWorkspaceRows(rows: Array<Record<string, unknown>>): DemoDatasetRow[] {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : value == null
          ? ""
          : String(value),
    ])
  ));
}

function designerField(field: WorkspaceField, dataset: WorkspaceDataset, index: number): DataField {
  const id = String(field.id || field.name || `field-${index + 1}`);
  const fieldType: FieldType = field.type === "number"
    ? "number"
    : field.type === "date"
      ? "date"
      : field.type === "boolean"
        ? "boolean"
        : "text";
  const semanticType: SemanticType = fieldType === "date"
    ? "date"
    : fieldType === "number"
      ? "quantity"
      : fieldType === "boolean"
        ? "boolean"
        : "category";
  const isMeasure = fieldType === "number";
  const defaultAggregation: Aggregation = isMeasure ? "Sum" : "None";
  const sampleValues = Array.from(new Set(dataset.rows
    .map((row) => row[id])
    .filter((value): value is string | number | boolean =>
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    )))
    .slice(0, 5);
  return {
    id,
    name: String(field.name || field.label || id),
    label: String(field.label || field.name || id),
    type: fieldType,
    semanticType,
    table: dataset.id,
    description: `Local field from ${dataset.name}`,
    sampleValues,
    isMeasure,
    isDimension: !isMeasure,
    defaultAggregation,
  };
}

export function getDatasources(snapshot?: WorkspaceLike): DesignerDatasource[] {
  const demoSources: DesignerDatasource[] = demoDatasources.map((datasource) => ({
    ...datasource,
    sourceType: "demo",
  }));
  const project = activeProject(snapshot);
  const localSources: DesignerDatasource[] = (project?.datasets ?? []).map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    database: "local",
    schema: project?.id ?? "project",
    table: dataset.id,
    rowCount: dataset.rowCount ?? dataset.rows.length,
    fieldCount: dataset.columnCount ?? dataset.fields.length,
    lastUpdated: dataset.updatedAt ?? "local",
    sourceType: "local",
    projectId: project?.id,
  }));
  return [...localSources, ...demoSources];
}

export function getDatasetSchema(datasourceId: string, snapshot?: WorkspaceLike): DatasetSchema {
  const dataset = canonicalDataset(datasourceId, snapshot);
  if (dataset) {
    return {
      available: true,
      datasourceId: dataset.id,
      datasetId: dataset.id,
      database: "local",
      schema: dataset.projectId,
      table: dataset.id,
      fields: dataset.fields.map((field, index) => designerField(field, dataset, index)),
    };
  }
  const datasource = demoDatasource(datasourceId);
  if (datasource) {
    return {
      available: true,
      datasourceId: datasource.id,
      datasetId: datasource.table,
      database: datasource.database,
      schema: datasource.schema,
      table: datasource.table,
      fields: demoDataFields.map((field) => ({ ...field, sampleValues: [...field.sampleValues] })),
    };
  }
  return {
    available: false,
    message: `Dataset ${datasourceId} is unavailable.`,
    datasourceId,
    datasetId: datasourceId,
    database: "local",
    schema: activeProject(snapshot)?.id ?? "unknown",
    table: datasourceId,
    fields: [],
  };
}

export function getDatasetRows(datasetId: string, snapshot?: WorkspaceLike): DemoDatasetRow[] {
  const dataset = canonicalDataset(datasetId, snapshot);
  if (dataset) return cloneWorkspaceRows(dataset.rows);
  return demoDatasource(datasetId) ? demoRows.map(cloneRow) : [];
}

export function refreshDataset(datasetId: string, snapshot?: WorkspaceLike): DemoDatasetRow[] {
  return getDatasetRows(datasetId, snapshot);
}

export function getDistinctFieldValues(rows: DemoDatasetRow[], fieldId: string) {
  return Array.from(new Set(rows.map((row) => String(row[fieldId] ?? "")))).sort((a, b) => a.localeCompare(b, "th"));
}

export type { DemoDatasource, DemoDatasetRow };
