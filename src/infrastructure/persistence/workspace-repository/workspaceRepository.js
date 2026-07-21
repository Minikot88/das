import {
  CANONICAL_WORKSPACE_KEY,
  MIGRATION_MARKER_KEY,
  WORKSPACE_SCHEMA_VERSION,
  cloneWorkspace,
  createEmptyWorkspace,
  normalizeWorkspaceDocument,
  validateWorkspaceDocument,
} from "@domain/workspace/workspaceSchema";
import {
  createMigrationCandidate,
  readLegacySourceValues,
  validateMigrationCandidate,
} from "@domain/workspace/workspaceMigrations";

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error, fallback) {
  return isObject(error) && typeof error.message === "string" && error.message ? error.message : fallback;
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function defaultBrowserStorage() {
  if (typeof window === "undefined") return createMemoryStorage();
  try {
    return window.localStorage ?? createMemoryStorage();
  } catch {
    return createMemoryStorage();
  }
}

function freezeWorkspace(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeWorkspace);
  return Object.freeze(value);
}

function parseCanonical(raw, clock) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { document: null, error: "invalid canonical JSON" };
  }
  if (parsed?.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    return {
      document: null,
      error: `unsupported canonical schema version: ${String(parsed?.schemaVersion)}`,
    };
  }
  let normalized;
  try {
    normalized = normalizeWorkspaceDocument(parsed, { clock });
  } catch (error) {
    return { document: null, error: errorMessage(error, "canonical workspace normalization failed") };
  }
  const validation = validateWorkspaceDocument(normalized);
  if (!validation.valid) {
    return { document: null, error: `canonical workspace validation failed: ${validation.errors.join("; ")}` };
  }
  return { document: normalized, error: "" };
}

function parseCompletedMarker(raw) {
  if (!raw) return false;
  try {
    const marker = JSON.parse(raw);
    return marker?.schemaVersion === WORKSPACE_SCHEMA_VERSION && marker?.status === "complete" && Boolean(marker?.completedAt)
      ? marker
      : null;
  } catch {
    return null;
  }
}

function markerMatchesWorkspace(marker, document) {
  return Boolean(
    marker &&
    document?.migration?.status === "complete" &&
    document.migration.completedAt === marker.completedAt &&
    JSON.stringify(document.migration.sourceFingerprints ?? {}) === JSON.stringify(marker.sourceFingerprints ?? {})
  );
}

function normalizeDatasetForWrite(projectId, dataset, clock) {
  const now = clock();
  const fields = Array.isArray(dataset?.fields) ? cloneWorkspace(dataset.fields) : [];
  const rows = Array.isArray(dataset?.rows) ? cloneWorkspace(dataset.rows) : [];
  return {
    ...cloneWorkspace(isObject(dataset) ? dataset : {}),
    id: String(dataset?.id || `dataset-${now}`),
    projectId,
    name: String(dataset?.name || "Untitled dataset"),
    source: String(dataset?.source || "local"),
    fields,
    rows,
    rowCount: rows.length,
    columnCount: fields.length,
    validation: isObject(dataset?.validation)
      ? {
          valid: dataset.validation.valid !== false,
          errors: Array.isArray(dataset.validation.errors) ? [...dataset.validation.errors] : [],
          warnings: Array.isArray(dataset.validation.warnings) ? [...dataset.validation.warnings] : [],
        }
      : { valid: true, errors: [], warnings: [] },
    createdAt: String(dataset?.createdAt || now),
    updatedAt: now,
  };
}

function normalizeChartForWrite(projectId, chart, clock) {
  const now = clock();
  const datasetId = typeof chart?.datasetId === "string" ? chart.datasetId : null;
  return {
    ...cloneWorkspace(isObject(chart) ? chart : {}),
    id: String(chart?.id || `chart-${now}`),
    projectId,
    datasetId,
    name: String(chart?.name || chart?.title || "Untitled chart"),
    title: String(chart?.title || chart?.name || "Untitled chart"),
    chartType: String(chart?.chartType || chart?.type || "bar"),
    engine: ["echarts", "chartjs", "unknown"].includes(chart?.engine) ? chart.engine : "unknown",
    config: isObject(chart?.config) ? cloneWorkspace(chart.config) : {},
    dataContract: isObject(chart?.dataContract) ? cloneWorkspace(chart.dataContract) : null,
    createdAt: String(chart?.createdAt || now),
    updatedAt: now,
  };
}

function normalizeDashboardForWrite(projectId, dashboard, clock) {
  const now = clock();
  const dashboardId = String(dashboard?.id || `dashboard-${now}`);
  const widgets = Array.isArray(dashboard?.widgets)
    ? dashboard.widgets.map((widget, index) => ({
        ...cloneWorkspace(widget),
        id: String(widget?.id || `widget-${index + 1}`),
        projectId,
        dashboardId,
        kind: String(widget?.kind || "unknown"),
        chartId: typeof widget?.chartId === "string" ? widget.chartId : null,
        layout: isObject(widget?.layout) ? cloneWorkspace(widget.layout) : { x: 0, y: 0, w: 4, h: 3, zIndex: index + 1 },
        presentation: isObject(widget?.presentation) ? cloneWorkspace(widget.presentation) : {},
        chartSnapshot: isObject(widget?.chartSnapshot) ? cloneWorkspace(widget.chartSnapshot) : null,
        assetRef: typeof widget?.assetRef === "string" ? widget.assetRef : null,
        createdAt: String(widget?.createdAt || now),
        updatedAt: now,
      }))
    : [];
  return {
    ...cloneWorkspace(isObject(dashboard) ? dashboard : {}),
    id: dashboardId,
    projectId,
    name: String(dashboard?.name || "Untitled dashboard"),
    widgets,
    canvasSettings: isObject(dashboard?.canvasSettings) ? cloneWorkspace(dashboard.canvasSettings) : {},
    legacySheetId: typeof dashboard?.legacySheetId === "string" ? dashboard.legacySheetId : null,
    createdAt: String(dashboard?.createdAt || now),
    updatedAt: now,
  };
}

export function createLocalWorkspaceRepository({
  storage = defaultBrowserStorage(),
  eventTarget = typeof window !== "undefined" ? window : null,
  clock = () => new Date().toISOString(),
  serialize = JSON.stringify,
} = {}) {
  let snapshot = freezeWorkspace(createEmptyWorkspace(clock));
  let status = { mode: "uninitialized", error: "", migrationReport: null };
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // A consumer failure must not roll back a committed workspace write.
      }
    });
  }

  function runMigrationDryRun() {
    return createMigrationCandidate(readLegacySourceValues(storage), { clock });
  }

  function activateFallback(reason) {
    const candidate = runMigrationDryRun();
    snapshot = freezeWorkspace(candidate.document);
    status = { mode: "legacy-fallback", error: reason, migrationReport: candidate.report };
    return { snapshot, status, report: candidate.report };
  }

  function migrateIfNeeded() {
    let canonicalRaw;
    try {
      canonicalRaw = storage.getItem(CANONICAL_WORKSPACE_KEY);
    } catch (error) {
      return activateFallback(errorMessage(error, "canonical workspace could not be read"));
    }
    if (canonicalRaw !== null) {
      const parsed = parseCanonical(canonicalRaw, clock);
      if (parsed.error) return activateFallback(parsed.error);
      let markerRaw;
      try {
        markerRaw = storage.getItem(MIGRATION_MARKER_KEY);
      } catch (error) {
        return activateFallback(errorMessage(error, "migration completion marker could not be read"));
      }
      const marker = parseCompletedMarker(markerRaw);
      if (!marker) {
        return activateFallback("canonical workspace completion marker is missing or incomplete");
      }
      if (!markerMatchesWorkspace(marker, parsed.document)) {
        return activateFallback("canonical workspace completion marker does not match the document");
      }
      snapshot = freezeWorkspace(parsed.document);
      status = { mode: "canonical", error: "", migrationReport: null };
      return { snapshot, status, report: null };
    }

    const candidate = runMigrationDryRun();
    const candidateValidation = validateMigrationCandidate(candidate);
    if (!candidateValidation.valid) {
      return activateFallback(`migration candidate validation failed: ${candidateValidation.errors.join("; ")}`);
    }

    const completedAt = clock();
    const committedDocument = {
      ...candidate.document,
      migration: {
        ...candidate.document.migration,
        status: "complete",
        completedAt,
      },
    };
    const committedValidation = validateWorkspaceDocument(committedDocument);
    if (!committedValidation.valid) {
      return activateFallback(`committed migration validation failed: ${committedValidation.errors.join("; ")}`);
    }

    let serialized;
    try {
      serialized = serialize(committedDocument);
      storage.setItem(CANONICAL_WORKSPACE_KEY, serialized);
    } catch (error) {
      return activateFallback(errorMessage(error, "canonical workspace could not be written"));
    }

    let readback;
    try {
      readback = storage.getItem(CANONICAL_WORKSPACE_KEY);
    } catch (error) {
      return activateFallback(errorMessage(error, "canonical readback could not be read"));
    }
    const parsedReadback = typeof readback === "string" ? parseCanonical(readback, clock) : { error: "canonical readback was missing" };
    if (parsedReadback.error) {
      return activateFallback(`canonical readback validation failed: ${parsedReadback.error}`);
    }

    const marker = {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      status: "complete",
      completedAt,
      sourceFingerprints: candidate.document.migration.sourceFingerprints,
    };
    try {
      storage.setItem(MIGRATION_MARKER_KEY, serialize(marker));
    } catch (error) {
      return activateFallback(errorMessage(error, "migration completion marker could not be written"));
    }

    let markerReadback;
    try {
      markerReadback = storage.getItem(MIGRATION_MARKER_KEY);
    } catch (error) {
      return activateFallback(errorMessage(error, "migration completion marker readback failed"));
    }
    const completedMarker = parseCompletedMarker(markerReadback);
    if (!completedMarker) {
      return activateFallback("migration completion marker readback was missing or invalid");
    }
    if (!markerMatchesWorkspace(completedMarker, parsedReadback.document)) {
      return activateFallback("migration completion marker readback does not match the canonical document");
    }

    snapshot = freezeWorkspace(parsedReadback.document);
    status = { mode: "canonical", error: "", migrationReport: candidate.report };
    notify();
    return { snapshot, status, report: candidate.report };
  }

  function update(mutator) {
    if (status.mode !== "canonical") throw new Error("Workspace repository is not writable in legacy fallback mode");
    const previous = snapshot;
    const draft = cloneWorkspace(snapshot);
    const mutated = mutator(draft);
    const nextValue = isObject(mutated) ? mutated : draft;
    const next = normalizeWorkspaceDocument({
      ...nextValue,
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      revision: previous.revision + 1,
      updatedAt: clock(),
    }, { clock });
    const validation = validateWorkspaceDocument(next);
    if (!validation.valid) throw new Error(`Workspace update validation failed: ${validation.errors.join("; ")}`);

    try {
      storage.setItem(CANONICAL_WORKSPACE_KEY, serialize(next));
      const readback = parseCanonical(storage.getItem(CANONICAL_WORKSPACE_KEY), clock);
      if (readback.error) throw new Error(`Workspace update readback failed: ${readback.error}`);
      if (
        readback.document.revision !== next.revision ||
        JSON.stringify(readback.document) !== JSON.stringify(next)
      ) {
        throw new Error("Workspace update readback did not persist the requested document");
      }
      snapshot = freezeWorkspace(readback.document);
      status = { ...status, error: "" };
      notify();
      return snapshot;
    } catch (error) {
      snapshot = previous;
      status = { ...status, error: errorMessage(error, "Workspace update failed") };
      throw error;
    }
  }

  function updateProject(projectId, updater) {
    if (!snapshot.projects.some((project) => project.id === projectId)) {
      throw new Error(`Project not found: ${projectId}`);
    }
    let result = null;
    update((current) => ({
      ...current,
      projects: current.projects.map((project) => {
        if (project.id !== projectId) return project;
        const updated = updater(project);
        result = updated.result;
        return updated.project;
      }),
    }));
    if (result === null) throw new Error(`Project not found: ${projectId}`);
    return result;
  }

  function setActiveProject(projectId, preferredDashboardId) {
    const project = snapshot.projects.find((item) => item.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const dashboard = project.dashboards.find((item) => item.id === preferredDashboardId)
      ?? project.dashboards.find((item) => item.id === snapshot.active.dashboardId)
      ?? project.dashboards[0]
      ?? null;
    update((current) => ({ ...current, active: { projectId, dashboardId: dashboard?.id ?? null } }));
    return project;
  }

  function setActiveDashboard(dashboardId) {
    const project = snapshot.projects.find((item) => item.id === snapshot.active.projectId);
    const dashboard = project?.dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) throw new Error(`Dashboard not found in the active project: ${dashboardId}`);
    update((current) => ({ ...current, active: { ...current.active, dashboardId } }));
    return dashboard;
  }

  function upsertProject(project) {
    const now = clock();
    const projectId = String(project?.id || `project-${now}`);
    const normalized = {
      ...cloneWorkspace(isObject(project) ? project : {}),
      id: projectId,
      name: String(project?.name || "Untitled project"),
      datasets: Array.isArray(project?.datasets) ? project.datasets : [],
      charts: Array.isArray(project?.charts) ? project.charts : [],
      dashboards: Array.isArray(project?.dashboards) ? project.dashboards : [],
      shares: Array.isArray(project?.shares) ? project.shares : [],
      connectionProfiles: [],
      legacySheetAliases: Array.isArray(project?.legacySheetAliases) ? project.legacySheetAliases : [],
      createdAt: String(project?.createdAt || now),
      updatedAt: now,
    };
    update((current) => ({
      ...current,
      projects: current.projects.some((item) => item.id === projectId)
        ? current.projects.map((item) => item.id === projectId ? normalized : item)
        : [...current.projects, normalized],
    }));
    return normalized;
  }

  function upsertDataset(projectId, dataset) {
    const normalized = normalizeDatasetForWrite(projectId, dataset, clock);
    return updateProject(projectId, (project) => ({
      result: normalized,
      project: {
        ...project,
        datasets: project.datasets.some((item) => item.id === normalized.id)
          ? project.datasets.map((item) => item.id === normalized.id ? normalized : item)
          : [...project.datasets, normalized],
        updatedAt: clock(),
      },
    }));
  }

  function deleteDataset(projectId, datasetId) {
    return updateProject(projectId, (project) => ({
      result: undefined,
      project: {
        ...project,
        datasets: project.datasets.filter((item) => item.id !== datasetId),
        charts: project.charts.map((chart) => {
          if (chart.datasetId !== datasetId) return chart;
          const contract = isObject(chart.dataContract) ? cloneWorkspace(chart.dataContract) : {};
          const rows = Array.isArray(contract.rows) ? contract.rows : [];
          return {
            ...chart,
            datasetId: null,
            dataContract: rows.length
              ? { ...contract, sourceType: "snapshot", datasetId: null }
              : {
                  sourceType: "unavailable",
                  datasetId: null,
                  fields: Array.isArray(contract.fields) ? contract.fields : [],
                  rows: [],
                },
            updatedAt: clock(),
          };
        }),
        updatedAt: clock(),
      },
    }));
  }

  function upsertChart(projectId, chart) {
    const normalized = normalizeChartForWrite(projectId, chart, clock);
    return updateProject(projectId, (project) => ({
      result: normalized,
      project: {
        ...project,
        charts: project.charts.some((item) => item.id === normalized.id)
          ? project.charts.map((item) => item.id === normalized.id ? normalized : item)
          : [...project.charts, normalized],
        updatedAt: clock(),
      },
    }));
  }

  function deleteChart(projectId, chartId) {
    return updateProject(projectId, (project) => ({
      result: undefined,
      project: {
        ...project,
        charts: project.charts.filter((item) => item.id !== chartId),
        dashboards: project.dashboards.map((dashboard) => ({
          ...dashboard,
          widgets: dashboard.widgets.filter((widget) => widget.chartId !== chartId),
        })),
        updatedAt: clock(),
      },
    }));
  }

  function upsertDashboard(projectId, dashboard) {
    const normalized = normalizeDashboardForWrite(projectId, dashboard, clock);
    return updateProject(projectId, (project) => ({
      result: normalized,
      project: {
        ...project,
        dashboards: project.dashboards.some((item) => item.id === normalized.id)
          ? project.dashboards.map((item) => item.id === normalized.id ? normalized : item)
          : [...project.dashboards, normalized],
        updatedAt: clock(),
      },
    }));
  }

  function upsertShare(projectId, share) {
    const project = snapshot.projects.find((item) => item.id === projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const now = clock();
    const normalized = {
      id: String(share?.id || `share-${now}`),
      projectId,
      dashboardId: String(share?.dashboardId || ""),
      legacySheetId: typeof share?.legacySheetId === "string" ? share.legacySheetId : null,
      mode: "local-readonly",
      snapshot: isObject(share?.snapshot) ? cloneWorkspace(share.snapshot) : {},
      createdAt: String(share?.createdAt || now),
      expiresAt: share?.expiresAt ? String(share.expiresAt) : null,
      updatedAt: now,
    };
    return updateProject(projectId, (currentProject) => ({
      result: normalized,
      project: {
        ...currentProject,
        shares: currentProject.shares.some((item) => item.id === normalized.id)
          ? currentProject.shares.map((item) => item.id === normalized.id ? normalized : item)
          : [...currentProject.shares, normalized],
        updatedAt: now,
      },
    }));
  }

  function resolveShare(shareId) {
    const matches = [];
    for (const project of snapshot.projects) {
      const share = project.shares.find((item) => item.id === shareId);
      if (share && share.availability !== "unavailable" && project.dashboards.some((dashboard) => dashboard.id === share.dashboardId)) {
        matches.push(share);
      }
    }
    return matches.length === 1 ? matches[0] : null;
  }

  function handleStorageEvent(event) {
    if (event?.key !== CANONICAL_WORKSPACE_KEY || typeof event?.newValue !== "string") return false;
    const parsed = parseCanonical(event.newValue, clock);
    if (parsed.error) {
      status = { ...status, error: `Ignored invalid cross-tab workspace update: ${parsed.error}` };
      return false;
    }
    let markerRaw;
    try {
      markerRaw = storage.getItem(MIGRATION_MARKER_KEY);
    } catch (error) {
      status = {
        ...status,
        error: `Ignored cross-tab workspace update: completion marker could not be read (${errorMessage(error, "storage read failed")})`,
      };
      return false;
    }
    const marker = parseCompletedMarker(markerRaw);
    if (!marker) {
      status = {
        ...status,
        error: "Ignored incomplete cross-tab workspace update: migration completion marker is missing or incomplete",
      };
      return false;
    }
    if (!markerMatchesWorkspace(marker, parsed.document)) {
      status = {
        ...status,
        error: "Ignored cross-tab workspace update: completion marker does not match the document",
      };
      return false;
    }
    if (status.mode === "canonical" && parsed.document.revision < snapshot.revision) {
      status = {
        ...status,
        error: `Ignored stale cross-tab workspace revision ${parsed.document.revision}; current revision is ${snapshot.revision}`,
      };
      return false;
    }
    if (status.mode === "canonical" && parsed.document.revision === snapshot.revision) {
      if (JSON.stringify(parsed.document) === JSON.stringify(snapshot)) return false;
      let persistedRaw;
      try {
        persistedRaw = storage.getItem(CANONICAL_WORKSPACE_KEY);
      } catch (error) {
        status = {
          ...status,
          error: `Ignored equal-revision cross-tab update: canonical storage could not be read (${errorMessage(error, "storage read failed")})`,
        };
        return false;
      }
      if (persistedRaw !== event.newValue) {
        status = { ...status, error: "Ignored stale equal-revision cross-tab workspace update" };
        return false;
      }
    }
    snapshot = freezeWorkspace(parsed.document);
    status = { mode: "canonical", error: "", migrationReport: status.migrationReport };
    notify();
    return true;
  }

  function useLegacyFallback(reason = "Canonical workspace disabled") {
    return activateFallback(reason);
  }

  const storageListener = (event) => handleStorageEvent(event);
  eventTarget?.addEventListener?.("storage", storageListener);

  return {
    getSnapshot: () => snapshot,
    getStatus: () => freezeWorkspace(cloneWorkspace(status)),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    runMigrationDryRun,
    migrateIfNeeded,
    useLegacyFallback,
    handleStorageEvent,
    update,
    setActiveProject,
    setActiveDashboard,
    upsertProject,
    upsertDataset,
    deleteDataset,
    upsertChart,
    deleteChart,
    upsertDashboard,
    upsertShare,
    resolveShare,
    dispose() {
      eventTarget?.removeEventListener?.("storage", storageListener);
      listeners.clear();
    },
  };
}

export const workspaceRepository = createLocalWorkspaceRepository();
