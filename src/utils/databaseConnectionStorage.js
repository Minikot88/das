export const DB_CONNECTIONS_STORAGE_KEY = "mini-bi-db-connections";

function safeParseConnections(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function loadDatabaseConnections() {
  if (typeof window === "undefined") return [];
  return safeParseConnections(window.localStorage.getItem(DB_CONNECTIONS_STORAGE_KEY));
}

export function saveDatabaseConnections(connections) {
  if (typeof window === "undefined") return [];
  const safeConnections = Array.isArray(connections) ? connections.filter(Boolean) : [];
  window.localStorage.setItem(DB_CONNECTIONS_STORAGE_KEY, JSON.stringify(safeConnections));
  return safeConnections;
}

export function upsertDatabaseConnection(profile) {
  const connections = loadDatabaseConnections();
  const index = connections.findIndex((item) => item.id === profile.id);
  const nextProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  const nextConnections =
    index >= 0
      ? connections.map((item) => (item.id === profile.id ? nextProfile : item))
      : [nextProfile, ...connections];
  saveDatabaseConnections(nextConnections);
  return nextConnections;
}

export function deleteDatabaseConnection(profileId) {
  const nextConnections = loadDatabaseConnections().filter((profile) => profile.id !== profileId);
  saveDatabaseConnections(nextConnections);
  return nextConnections;
}

export function createConnectionProfile({ form, type, status = "demo", lastTestedAt = null }) {
  const now = new Date().toISOString();
  const savePassword = Boolean(form.savePassword);

  return {
    id: form.id || `db-${Date.now()}`,
    name: form.connectionName || `${type.name} Connection`,
    type: type.id,
    typeName: type.name,
    host: form.host,
    port: form.port,
    database: form.database,
    filePath: form.filePath,
    sheetUrl: form.sheetUrl,
    url: form.url,
    authType: form.authType,
    username: form.username,
    savePassword,
    passwordSaved: savePassword,
    passwordMasked: savePassword ? "••••••••" : "",
    ssl: form.ssl,
    ssh: form.ssh,
    advanced: form.advanced,
    workspace: form.workspace,
    tags: form.tags,
    createdAt: form.createdAt || now,
    updatedAt: now,
    lastTestedAt,
    status,
  };
}
