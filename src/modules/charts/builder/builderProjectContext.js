/**
 * Project-scoped builder routes must never turn a serialized missing value
 * into an API request.  Keeping this pure also makes the route bootstrap
 * independently testable from the legacy workspace store.
 */
export function normalizeProjectId(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id && id !== "null" && id !== "undefined" ? id : null;
}

export function resolveBuilderProject(projects, requestedProjectId, activeProjectId = null) {
  const requestedId = normalizeProjectId(requestedProjectId) ?? normalizeProjectId(activeProjectId);
  if (!requestedId) return null;
  return projects.find((project) => project.id === requestedId) ?? null;
}
