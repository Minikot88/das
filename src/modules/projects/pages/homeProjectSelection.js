export function resolveHomeActiveProject(projects, {
  mockMode,
  activeProjectId,
  preferredProjectId,
  resolveMockProject,
} = {}) {
  if (mockMode) return resolveMockProject?.(projects) ?? projects[0] ?? null;
  return projects.find((project) => project.id === preferredProjectId)
    ?? projects.find((project) => project.id === activeProjectId)
    ?? projects[0]
    ?? null;
}
