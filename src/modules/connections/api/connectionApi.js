import { apiRequest, encodeApiPathSegment, isMockMode } from "@infrastructure/http/client";

function mapConnection(record) {
  const metadata = record?.metadataJson && typeof record.metadataJson === "object" ? record.metadataJson : {};
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    type: "postgresql",
    typeName: "PostgreSQL",
    mode: "host",
    host: metadata.host ?? "",
    port: String(metadata.port ?? 5432),
    database: metadata.database ?? "",
    username: metadata.user ?? "",
    passwordSaved: true,
    credentialState: "server-managed",
    secretRef: "server-managed",
    ssl: { enabled: Boolean(metadata.ssl), mode: metadata.ssl ? "Require" : "Disable" },
    status: record.status,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listConnectionProfiles(projectId) {
  if (isMockMode()) return null;
  const rows = await apiRequest(`/api/v1/connections?projectId=${encodeURIComponent(projectId)}`);
  return Array.isArray(rows) ? rows.map(mapConnection) : [];
}

export async function createServerConnection(form, projectId) {
  const record = await apiRequest("/api/v1/connections", {
    method: "POST",
    body: JSON.stringify({ projectId, name: form.connectionName, type: form.type, host: form.host, port: Number(form.port), database: form.database, user: form.username, password: form.password, ssl: Boolean(form.ssl?.enabled) }),
  });
  return mapConnection(record);
}

export async function testServerConnection(form, profileId = "") {
  if (profileId && !form.password) return apiRequest(`/api/v1/connections/${encodeApiPathSegment(profileId)}/test`, { method: "POST" });
  return apiRequest("/api/v1/connections/test", {
    method: "POST",
    body: JSON.stringify({ type: form.type, host: form.host, port: Number(form.port), database: form.database, user: form.username, password: form.password, ssl: Boolean(form.ssl?.enabled) }),
  });
}

export async function deleteServerConnection(profile) {
  return apiRequest(`/api/v1/connections/${encodeApiPathSegment(profile.id)}`, { method: "DELETE", body: JSON.stringify({ revision: profile.revision }) });
}

export async function discoverConnectionSchema(connectionId) {
  return apiRequest(`/api/v1/connections/${encodeApiPathSegment(connectionId)}/schema`);
}
