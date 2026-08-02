import { apiRequest, encodeApiPathSegment, isMockMode } from "@infrastructure/http/client";
import { mockDataset } from "@infrastructure/mock/mockData";
import { useStore } from "@app/store/useStore";

function activeProjectId() {
  return useStore.getState().activeProjectId;
}

function normalizeDataType(type) {
  const value = String(type || "").toLowerCase();
  if (value === "number") return "number";
  if (/(^|\s)(smallint|integer|bigint|numeric|decimal|real|double precision|money)($|\s)/.test(value)) return "number";
  if (/(date|time)/.test(value)) return "date";
  if (/(bool)/.test(value)) return "boolean";
  return "string";
}

function normalizeField(field) {
  return {
    ...field,
    name: field.fieldKey ?? field.name,
    label: field.label ?? field.name ?? field.fieldKey,
    sourceType: field.dataType ?? field.type ?? "string",
    type: normalizeDataType(field.dataType ?? field.type),
  };
}

export async function listDatasets({ projectId = activeProjectId(), page = 1, pageSize = 50 } = {}) {
  if (isMockMode()) {
    return { items: [mockDataset], total: 1, page: 1, pageSize };
  }
  if (!projectId) return { items: [], total: 0, page, pageSize };
  return apiRequest(
    `/api/v1/datasets?projectId=${encodeURIComponent(projectId)}&page=${page}&pageSize=${pageSize}`,
  );
}

export async function getDatasetDetail(datasetId) {
  if (isMockMode()) return mockDataset;
  return apiRequest(`/api/v1/datasets/${encodeApiPathSegment(datasetId)}`);
}

export async function getDatasetFields(datasetId) {
  if (isMockMode()) return mockDataset.fields;
  const fields = await apiRequest(`/api/v1/datasets/${encodeApiPathSegment(datasetId)}/fields`);
  return Array.isArray(fields) ? fields.map(normalizeField) : [];
}

export async function queryDataset(datasetId, query = {}) {
  if (isMockMode()) {
    return {
      rows: mockDataset.rows,
      total: mockDataset.rows.length,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || mockDataset.rows.length),
      truncated: false,
    };
  }
  return apiRequest(`/api/v1/datasets/${encodeApiPathSegment(datasetId)}/query`, {
    method: "POST",
    body: JSON.stringify(query),
  });
}

export async function loadDataset(datasetId, { pageSize = 10000 } = {}) {
  if (isMockMode()) return mockDataset;
  const [dataset, fields, result] = await Promise.all([
    getDatasetDetail(datasetId),
    getDatasetFields(datasetId),
    queryDataset(datasetId, { page: 1, pageSize }),
  ]);
  return { ...dataset, fields, rows: result?.rows ?? [] };
}

export async function loadDefaultProjectDataset(projectId = activeProjectId()) {
  const response = await listDatasets({ projectId, page: 1, pageSize: 1 });
  const dataset = response?.items?.[0];
  return dataset ? loadDataset(dataset.id) : null;
}

export async function importDatasetCsv({ file, projectId = activeProjectId(), name, idempotencyKey }) {
  if (isMockMode()) throw new Error("CSV HTTP import is disabled in explicit mock mode.");
  const form = new FormData();
  form.append("file", file);
  form.append("projectId", projectId);
  if (name) form.append("name", name);
  return apiRequest("/api/v1/datasets/import", {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    body: form,
  });
}

export async function archiveDataset(datasetId, revision) {
  if (isMockMode()) return { success: true };
  return apiRequest(`/api/v1/datasets/${encodeApiPathSegment(datasetId)}`, {
    method: "DELETE",
    body: JSON.stringify({ revision }),
  });
}

export async function renameDataset(datasetId, { name, revision }) {
  if (isMockMode()) throw new Error("Catalog editing is disabled in explicit mock mode.");
  return apiRequest(`/api/v1/datasets/${encodeApiPathSegment(datasetId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name, revision }),
  });
}

export async function listExternalSources(projectId = activeProjectId()) {
  if (isMockMode() || !projectId) return { items: [] };
  return apiRequest(`/api/v1/external-sources?projectId=${encodeURIComponent(projectId)}`);
}
export async function listExternalTables(schemaName, projectId = activeProjectId()) {
  return apiRequest(`/api/v1/external-sources/${encodeApiPathSegment(schemaName)}/tables?projectId=${encodeURIComponent(projectId)}`);
}
export async function listExternalColumns(schemaName, tableName, projectId = activeProjectId()) {
  return apiRequest(`/api/v1/external-sources/${encodeApiPathSegment(schemaName)}/tables/${encodeApiPathSegment(tableName)}/columns?projectId=${encodeURIComponent(projectId)}`);
}
export async function listExternalRelationships(schemaName, tableName, projectId = activeProjectId(), targetTable) {
  const target = targetTable ? `&targetTable=${encodeURIComponent(targetTable)}` : "";
  return apiRequest(`/api/v1/external-sources/${encodeApiPathSegment(schemaName)}/tables/${encodeApiPathSegment(tableName)}/relationships?projectId=${encodeURIComponent(projectId)}${target}`);
}
export async function listExternalMetadata(schemaName, tableName, projectId = activeProjectId()) {
  return apiRequest(`/api/v1/external-sources/${encodeApiPathSegment(schemaName)}/tables/${encodeApiPathSegment(tableName)}/metadata?projectId=${encodeURIComponent(projectId)}`);
}
export async function previewExternalSource(input, { signal } = {}) {
  return apiRequest('/api/v1/external-sources/preview', { method: 'POST', body: JSON.stringify(input), signal });
}
export async function createExternalDataset(input) {
  return apiRequest('/api/v1/datasets/external', { method: 'POST', body: JSON.stringify(input) });
}
