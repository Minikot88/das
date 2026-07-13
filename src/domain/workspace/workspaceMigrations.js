import {
  WORKSPACE_SCHEMA_VERSION,
  createEmptyWorkspace,
  normalizeWorkspaceDocument,
  validateWorkspaceDocument,
} from "./workspaceSchema";

export const LEGACY_SOURCE_KEYS = Object.freeze([
  "mini-bi-v8-workspace",
  "mini-bi-projects",
  "mini-bi-active-project-id",
  "mini-bi-active-dashboard-id",
  "dashboard-v2-saved-charts",
  "dashboard-v2-chart-config",
  "dashboard-canvas-layout-v1",
  "mini-bi-theme",
]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function timestamp(value, fallback) {
  return asString(value, fallback);
}

function stableId(value, fallback) {
  return asString(value, fallback);
}

function valuesDiffer(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function conflict(entityType, entityId, field, chosenSource) {
  return {
    entityType,
    entityId,
    field,
    sources: ["zustand", "project-storage"],
    chosenSource,
  };
}

function parseJsonSource(raw, key, fallback, warnings) {
  if (raw === null || typeof raw === "undefined" || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    warnings.push(`${key} contains invalid JSON and was skipped`);
    return fallback;
  }
}

function legacyRecords(value, label, warnings, idKeys = ["id"]) {
  if (value !== null && typeof value !== "undefined" && !Array.isArray(value)) {
    warnings.push(`${label} has a malformed collection and was skipped`);
    return [];
  }
  return asArray(value).filter((item, index) => {
    const hasIdentity = isObject(item) && idKeys.some((key) => asString(item?.[key], ""));
    if (!hasIdentity) warnings.push(`${label}[${index}] is malformed and was skipped`);
    return hasIdentity;
  });
}

function normalizeField(field, index) {
  const name = stableId(field?.name ?? field?.id, `field-${index + 1}`);
  const rawType = asString(field?.type, "unknown");
  const type = rawType === "category" ? "text" : rawType;
  return {
    id: stableId(field?.id, name),
    name,
    label: asString(field?.label, name),
    type: ["text", "number", "date", "boolean", "unknown"].includes(type) ? type : "unknown",
    ...(typeof field?.isMeasure === "boolean" ? { isMeasure: field.isMeasure } : {}),
    ...(typeof field?.isDimension === "boolean" ? { isDimension: field.isDimension } : {}),
    ...(typeof field?.semanticType === "string" ? { semanticType: field.semanticType } : {}),
    ...(typeof field?.format === "string" ? { format: field.format } : {}),
    ...(typeof field?.aggregation === "string" ? { aggregation: field.aggregation } : {}),
  };
}

function normalizeDataset(dataset, projectId, index, clock) {
  const rows = asArray(dataset?.rows);
  const fields = asArray(dataset?.fields).map(normalizeField);
  const now = clock();
  return {
    id: stableId(dataset?.id, `dataset-${index + 1}`),
    projectId,
    name: asString(dataset?.name, `Dataset ${index + 1}`),
    source: asString(dataset?.source ?? dataset?.fileName, "legacy-local"),
    fields,
    rows,
    rowCount: Number.isInteger(dataset?.rowCount) ? dataset.rowCount : rows.length,
    columnCount: Number.isInteger(dataset?.columnCount) ? dataset.columnCount : fields.length,
    validation: {
      valid: dataset?.validation?.valid !== false,
      errors: asArray(dataset?.validation?.errors).map(String),
      warnings: asArray(dataset?.validation?.warnings).map(String),
    },
    createdAt: timestamp(dataset?.createdAt, now),
    updatedAt: timestamp(dataset?.updatedAt, now),
  };
}

function normalizeChart(chart, projectId, index, engine, clock) {
  const now = clock();
  const datasetId = asString(chart?.datasetId ?? chart?.datasetInfo?.datasetId ?? chart?.dataContract?.datasetId, "") || null;
  const rows = asArray(chart?.dataContract?.rows ?? chart?.queryResult?.rows ?? chart?.rows);
  const fields = asArray(chart?.dataContract?.fields ?? chart?.queryResult?.fields ?? chart?.fields).map(normalizeField);
  const sourceType = asString(chart?.dataContract?.sourceType ?? chart?.datasetInfo?.sourceType, datasetId ? "dataset" : rows.length ? "snapshot" : "unknown");
  return {
    id: stableId(chart?.id ?? chart?.chartId, `chart-${index + 1}`),
    projectId,
    datasetId,
    name: asString(chart?.name ?? chart?.title, `Chart ${index + 1}`),
    title: asString(chart?.title ?? chart?.name, `Chart ${index + 1}`),
    chartType: asString(chart?.chartType ?? chart?.type, "bar"),
    engine,
    config: isObject(chart?.config) ? chart.config : isObject(chart?.chartConfig) ? chart.chartConfig : {},
    dataContract: {
      sourceType,
      datasetId,
      fields,
      rows,
      ...(asString(chart?.dataContract?.queryText ?? chart?.queryText ?? chart?.query?.text, "")
        ? { queryText: asString(chart?.dataContract?.queryText ?? chart?.queryText ?? chart?.query?.text) }
        : {}),
    },
    createdAt: timestamp(chart?.createdAt, now),
    updatedAt: timestamp(chart?.updatedAt, now),
  };
}

function normalizeLayout(layout, fallbackIndex = 0) {
  return {
    x: Number.isFinite(Number(layout?.x)) ? Number(layout.x) : 0,
    y: Number.isFinite(Number(layout?.y)) ? Number(layout.y) : 0,
    w: Number.isFinite(Number(layout?.w)) ? Number(layout.w) : 4,
    h: Number.isFinite(Number(layout?.h)) ? Number(layout.h) : 3,
    zIndex: Number.isFinite(Number(layout?.zIndex)) ? Number(layout.zIndex) : fallbackIndex + 1,
  };
}

function normalizeWidget(widget, projectId, dashboardId, index, clock, fallbackLayout) {
  const now = clock();
  const kind = asString(widget?.kind ?? widget?.type, widget?.chartId ? "chart" : "unknown");
  const chartId = asString(
    widget?.chartId ?? widget?.sourceChartId ?? widget?.sourceChartConfigId ?? widget?.config?.sourceChartId,
    "",
  ) || null;
  const basePresentation = isObject(widget?.presentation)
    ? widget.presentation
    : isObject(widget?.config)
      ? widget.config
      : {};
  const presentation = {
    ...basePresentation,
    ...(typeof widget?.title === "string" ? { title: widget.title } : {}),
    ...(typeof widget?.visible === "boolean" ? { visible: widget.visible } : {}),
    ...(typeof widget?.background === "string" ? { background: widget.background } : {}),
    ...(typeof widget?.borderColor === "string" ? { borderColor: widget.borderColor } : {}),
    ...(Number.isFinite(Number(widget?.radius)) ? { radius: Number(widget.radius) } : {}),
  };
  return {
    id: stableId(widget?.id ?? widget?.instanceId ?? fallbackLayout?.i, `widget-${index + 1}`),
    projectId,
    dashboardId,
    kind: ["chart", "kpi", "table", "text", "image", "filter", "shape", "divider", "button"].includes(kind)
      ? kind
      : "unknown",
    chartId,
    layout: normalizeLayout(widget?.layout ?? fallbackLayout ?? widget, index),
    presentation,
    chartSnapshot: isObject(widget?.chartSnapshot)
      ? widget.chartSnapshot
      : isObject(widget?.chartConfigSnapshot)
        ? widget.chartConfigSnapshot
        : null,
    assetRef: typeof widget?.assetRef === "string" ? widget.assetRef : null,
    createdAt: timestamp(widget?.createdAt, now),
    updatedAt: timestamp(widget?.updatedAt, now),
  };
}

function normalizeCurrentDashboard(dashboard, projectId, index, clock, warnings = []) {
  const now = clock();
  const dashboardId = stableId(dashboard?.id ?? dashboard?.dashboardId, `dashboard-${index + 1}`);
  const canvasSettings = isObject(dashboard?.canvasSettings) ? dashboard.canvasSettings : {};
  const theme = dashboard?.theme === "dark" || canvasSettings.theme === "dark" ? "dark" : "light";
  return {
    id: dashboardId,
    projectId,
    name: asString(dashboard?.name ?? dashboard?.dashboardName, `Dashboard ${index + 1}`),
    widgets: legacyRecords(dashboard?.widgets, `dashboard ${dashboardId} widgets`, warnings, ["id", "instanceId"]).map((widget, widgetIndex) =>
      normalizeWidget(widget, projectId, dashboardId, widgetIndex, clock)
    ),
    canvasSettings: { ...canvasSettings, theme },
    theme,
    legacySheetId: typeof dashboard?.legacySheetId === "string" ? dashboard.legacySheetId : null,
    createdAt: timestamp(dashboard?.createdAt, now),
    updatedAt: timestamp(dashboard?.updatedAt, now),
  };
}

function readCompatibilityFallbacks(rawByKey, projectId, clock, warnings) {
  const savedChartsSource = parseJsonSource(
    rawByKey["dashboard-v2-saved-charts"],
    "dashboard-v2-saved-charts",
    [],
    warnings,
  );
  const charts = legacyRecords(savedChartsSource, "dashboard-v2-saved-charts", warnings, ["id", "chartId"])
    .map((chart, index) => normalizeChart(chart, projectId, index, "echarts", clock));
  const layoutSource = parseJsonSource(
    rawByKey["dashboard-canvas-layout-v1"],
    "dashboard-canvas-layout-v1",
    null,
    warnings,
  );
  const dashboards = isObject(layoutSource) && asString(layoutSource.id ?? layoutSource.dashboardId, "")
    ? [normalizeCurrentDashboard(layoutSource, projectId, 0, clock, warnings)]
    : [];
  if (isObject(layoutSource) && !dashboards.length) {
    warnings.push("dashboard-canvas-layout-v1 is malformed and was skipped");
  }
  return { charts, dashboards };
}

function applyCompatibilityFallbacks(projects, rawByKey, clock, warnings) {
  const requestedProjectId = asString(rawByKey["mini-bi-active-project-id"], "") || null;
  let targetProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0] ?? null;
  const fallbackProjectId = targetProject?.id ?? requestedProjectId ?? "project-default";
  const compatibility = readCompatibilityFallbacks(rawByKey, fallbackProjectId, clock, warnings);

  if (!targetProject && (compatibility.charts.length || compatibility.dashboards.length)) {
    const now = clock();
    targetProject = {
      id: fallbackProjectId,
      name: "Recovered workspace",
      datasets: [],
      charts: [],
      dashboards: [],
      shares: [],
      connectionProfiles: [],
      legacySheetAliases: [],
      createdAt: now,
      updatedAt: now,
    };
    projects = [...projects, targetProject];
  }

  if (targetProject) {
    projects = projects.map((project) => {
      if (project.id !== targetProject.id) return project;
      return {
        ...project,
        charts: project.charts.length ? project.charts : compatibility.charts,
        dashboards: project.dashboards.length ? project.dashboards : compatibility.dashboards,
      };
    });
  }

  return { projects, compatibility };
}

function normalizeZustandDashboard(dashboard, projectId, sheetId, index, clock, warnings = []) {
  const now = clock();
  const dashboardId = stableId(dashboard?.id, `dashboard-${index + 1}`);
  const layouts = new Map(asArray(dashboard?.layout).map((layout) => [String(layout?.i), layout]));
  const widgets = legacyRecords(dashboard?.charts, `dashboard ${dashboardId} widgets`, warnings, ["id", "instanceId", "chartId"]).map((widget, widgetIndex) => {
    const widgetId = stableId(widget?.id ?? widget?.instanceId, `widget-${widgetIndex + 1}`);
    return normalizeWidget(widget, projectId, dashboardId, widgetIndex, clock, layouts.get(widgetId));
  });
  return {
    id: dashboardId,
    projectId,
    name: asString(dashboard?.name, `Dashboard ${index + 1}`),
    widgets,
    canvasSettings: isObject(dashboard?.canvasSettings)
      ? dashboard.canvasSettings
      : isObject(dashboard?.canvasSize)
        ? dashboard.canvasSize
        : {},
    legacySheetId: sheetId,
    createdAt: timestamp(dashboard?.createdAt, now),
    updatedAt: timestamp(dashboard?.updatedAt, now),
  };
}

function normalizeShare(share, projectId, index, clock) {
  const now = clock();
  return {
    id: stableId(share?.id, `share-${index + 1}`),
    projectId,
    dashboardId: stableId(share?.dashboardId, ""),
    legacySheetId: asString(share?.sheetId, "") || null,
    mode: "local-readonly",
    snapshot: isObject(share?.snapshot) ? share.snapshot : {},
    createdAt: timestamp(share?.createdAt, now),
    expiresAt: typeof share?.expiresAt === "string" ? share.expiresAt : null,
    updatedAt: timestamp(share?.updatedAt, timestamp(share?.createdAt, now)),
  };
}

function convertZustand(source, clock, warnings = []) {
  if (!isObject(source)) return { projects: [], settings: null, activeProjectId: null, activeDashboardId: null };
  const sourceProjects = legacyRecords(source.projects, "mini-bi-v8-workspace projects", warnings);
  const normalizedProjectIds = sourceProjects.map((project, index) => stableId(project?.id, `project-${index + 1}`));
  const requestedActiveProjectId = asString(source.activeProjectId, "") || null;
  const activeProjectId = normalizedProjectIds.includes(requestedActiveProjectId)
    ? requestedActiveProjectId
    : normalizedProjectIds[0] ?? null;
  const knownProjectIds = new Set(normalizedProjectIds);
  const globalDatasets = legacyRecords(source.importedDatasets, "mini-bi-v8-workspace datasets", warnings);
  const globalCharts = legacyRecords(source.charts, "mini-bi-v8-workspace charts", warnings, ["id", "chartId"]);
  const globalShares = Object.values(isObject(source.shareLinks) ? source.shareLinks : {}).filter((share, index) => {
    const valid = isObject(share) && asString(share.id, "");
    if (!valid) warnings.push(`mini-bi-v8-workspace shares[${index}] is malformed and was skipped`);
    return valid;
  });
  const belongsToProject = (item, projectId) => {
    const claimedProjectId = asString(item?.projectId, "") || null;
    return claimedProjectId && knownProjectIds.has(claimedProjectId)
      ? claimedProjectId === projectId
      : projectId === activeProjectId;
  };
  const projects = sourceProjects.map((project, projectIndex) => {
    const now = clock();
    const projectId = stableId(project?.id, `project-${projectIndex + 1}`);
    const sheets = legacyRecords(project?.sheets, `project ${projectId} sheets`, warnings);
    const dashboards = [];
    const legacySheetAliases = [];
    sheets.forEach((sheet, sheetIndex) => {
      const sheetId = stableId(sheet?.id, `sheet-${sheetIndex + 1}`);
      const sheetDashboards = legacyRecords(sheet?.dashboards, `sheet ${sheetId} dashboards`, warnings).map((dashboard, dashboardIndex) =>
        normalizeZustandDashboard(dashboard, projectId, sheetId, dashboardIndex, clock, warnings)
      );
      dashboards.push(...sheetDashboards);
      legacySheetAliases.push({
        sheetId,
        name: asString(sheet?.name, `Sheet ${sheetIndex + 1}`),
        dashboardIds: sheetDashboards.map((dashboard) => dashboard.id),
      });
    });
    return {
      id: projectId,
      name: asString(project?.name, `Project ${projectIndex + 1}`),
      datasets: globalDatasets
        .filter((dataset) => belongsToProject(dataset, projectId))
        .map((dataset, index) => normalizeDataset(dataset, projectId, index, clock)),
      charts: globalCharts
        .filter((chart) => belongsToProject(chart, projectId))
        .map((chart, index) => normalizeChart(chart, projectId, index, "chartjs", clock)),
      dashboards,
      shares: globalShares
        .filter((share) => belongsToProject(share, projectId))
        .map((share, index) => normalizeShare(share, projectId, index, clock)),
      connectionProfiles: [],
      legacySheetAliases,
      createdAt: timestamp(project?.createdAt, now),
      updatedAt: timestamp(project?.updatedAt, now),
    };
  });
  const activeSourceProject = sourceProjects[normalizedProjectIds.indexOf(activeProjectId)] ?? null;
  const activeSheetId = asString(source.activeSheetId, "") || null;
  const activeSheet = asArray(activeSourceProject?.sheets).find((sheet) => sheet?.id === activeSheetId) ?? null;
  const sheetDashboardId = asString(activeSheet?.activeDashboardId, "")
    || asString(activeSheet?.dashboards?.[0]?.id, "")
    || null;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const dashboardIds = new Set(activeProject?.dashboards.map((dashboard) => dashboard.id) ?? []);
  const requestedActiveDashboardId = asString(source.activeDashboardId, "") || null;
  const activeDashboardId = dashboardIds.has(requestedActiveDashboardId)
    ? requestedActiveDashboardId
    : dashboardIds.has(sheetDashboardId)
      ? sheetDashboardId
      : activeProject?.dashboards[0]?.id ?? null;
  return {
    projects,
    settings: {
      ...(isObject(source.appSettings) ? source.appSettings : {}),
      theme: asString(source.appSettings?.theme ?? source.theme, "system"),
      locale: asString(source.locale, "th"),
    },
    activeProjectId,
    activeDashboardId,
  };
}

function convertProjectStorage(source, clock, warnings = []) {
  const projects = legacyRecords(source, "mini-bi-projects", warnings).map((project, projectIndex) => {
    const now = clock();
    const projectId = stableId(project?.id, `project-${projectIndex + 1}`);
    return {
      id: projectId,
      name: asString(project?.name, `Project ${projectIndex + 1}`),
      datasets: legacyRecords(project?.datasets, `project ${projectId} datasets`, warnings).map((dataset, index) => normalizeDataset(dataset, projectId, index, clock)),
      charts: legacyRecords(project?.charts, `project ${projectId} charts`, warnings, ["id", "chartId"]).map((chart, index) => normalizeChart(chart, projectId, index, "echarts", clock)),
      dashboards: legacyRecords(project?.dashboards, `project ${projectId} dashboards`, warnings, ["id", "dashboardId"]).map((dashboard, index) => normalizeCurrentDashboard(dashboard, projectId, index, clock, warnings)),
      shares: legacyRecords(project?.shares, `project ${projectId} shares`, warnings).map((share, index) => normalizeShare(share, projectId, index, clock)),
      connectionProfiles: [],
      legacySheetAliases: legacyRecords(project?.legacySheetAliases, `project ${projectId} Sheet aliases`, warnings, ["sheetId"]),
      createdAt: timestamp(project?.createdAt, now),
      updatedAt: timestamp(project?.updatedAt, now),
    };
  });
  return { projects };
}

function mergeById(primary, secondary, mergeItem) {
  const result = primary.map((item) => ({ ...item }));
  const indexes = new Map(result.map((item, index) => [item.id, index]));
  secondary.forEach((item) => {
    const existingIndex = indexes.get(item.id);
    if (typeof existingIndex === "number") {
      result[existingIndex] = mergeItem(result[existingIndex], item);
    } else {
      indexes.set(item.id, result.length);
      result.push(item);
    }
  });
  return result;
}

function remapDuplicateIds(items, entityType, sourceName, conflicts) {
  const reservedIds = new Set(items.map((item) => item.id));
  const assignedIds = new Set();
  return items.map((item) => {
    const id = item.id;
    if (!assignedIds.has(id)) {
      assignedIds.add(id);
      return item;
    }
    let suffix = 2;
    let remappedId = `${id}~${sourceName}-${suffix}`;
    while (reservedIds.has(remappedId) || assignedIds.has(remappedId)) {
      suffix += 1;
      remappedId = `${id}~${sourceName}-${suffix}`;
    }
    assignedIds.add(remappedId);
    conflicts.push({
      entityType,
      entityId: id,
      field: "id",
      sources: [sourceName],
      chosenSource: remappedId,
    });
    return { ...item, id: remappedId };
  });
}

function assignProjectOwnership(project, projectId) {
  return {
    ...project,
    id: projectId,
    datasets: project.datasets.map((dataset) => ({ ...dataset, projectId })),
    charts: project.charts.map((chart) => ({ ...chart, projectId })),
    dashboards: project.dashboards.map((dashboard) => ({
      ...dashboard,
      projectId,
      widgets: dashboard.widgets.map((widget) => ({ ...widget, projectId, dashboardId: dashboard.id })),
    })),
    shares: project.shares.map((share) => ({ ...share, projectId })),
    connectionProfiles: project.connectionProfiles.map((profile) => ({ ...profile, projectId })),
  };
}

function remapSourceCollisions(projects, sourceName, conflicts) {
  const projectOccurrences = new Map();
  return projects.map((sourceProject) => {
    const occurrence = (projectOccurrences.get(sourceProject.id) ?? 0) + 1;
    projectOccurrences.set(sourceProject.id, occurrence);
    const projectId = occurrence === 1
      ? sourceProject.id
      : `${sourceProject.id}~${sourceName}-${occurrence}`;
    if (occurrence > 1) {
      conflicts.push({
        entityType: "project",
        entityId: sourceProject.id,
        field: "id",
        sources: [sourceName],
        chosenSource: projectId,
      });
    }
    const project = assignProjectOwnership(sourceProject, projectId);
    const dashboards = remapDuplicateIds(project.dashboards, "dashboard", sourceName, conflicts)
      .map((dashboard) => ({
        ...dashboard,
        projectId,
        widgets: remapDuplicateIds(dashboard.widgets, "widget", sourceName, conflicts)
          .map((widget) => ({ ...widget, projectId, dashboardId: dashboard.id })),
      }));
    return {
      ...project,
      datasets: remapDuplicateIds(project.datasets, "dataset", sourceName, conflicts),
      charts: remapDuplicateIds(project.charts, "chart", sourceName, conflicts),
      dashboards,
      shares: remapDuplicateIds(project.shares, "share", sourceName, conflicts),
      legacySheetAliases: project.legacySheetAliases.map((alias) => {
        const ownedDashboardIds = dashboards
          .filter((dashboard) => dashboard.legacySheetId === alias.sheetId)
          .map((dashboard) => dashboard.id);
        return {
          ...alias,
          dashboardIds: ownedDashboardIds.length ? ownedDashboardIds : alias.dashboardIds,
        };
      }),
    };
  });
}

function mergeDatasets(current, zustand, projectId, conflicts) {
  return mergeById(current, zustand, (primary, secondary) => {
    if (valuesDiffer(primary.rows, secondary.rows)) conflicts.push(conflict("dataset", primary.id, "rows", "zustand"));
    if (valuesDiffer(primary.fields, secondary.fields)) conflicts.push(conflict("dataset", primary.id, "fields", "zustand"));
    return {
      ...primary,
      projectId,
      fields: secondary.fields.length ? secondary.fields : primary.fields,
      rows: secondary.rows.length ? secondary.rows : primary.rows,
      rowCount: secondary.rows.length ? secondary.rows.length : primary.rowCount,
      columnCount: secondary.fields.length ? secondary.fields.length : primary.columnCount,
      validation: secondary.validation?.valid ? secondary.validation : primary.validation,
    };
  });
}

function mergeCharts(current, zustand, projectId, conflicts) {
  return mergeById(current, zustand, (primary, secondary) => {
    ["name", "title", "chartType", "config"].forEach((field) => {
      if (valuesDiffer(primary[field], secondary[field])) conflicts.push(conflict("chart", primary.id, field, "project-storage"));
    });
    return {
      ...secondary,
      ...primary,
      projectId,
      config: Object.keys(primary.config ?? {}).length ? primary.config : secondary.config,
      engine: primary.engine === "unknown" ? secondary.engine : primary.engine,
      dataContract: primary.dataContract?.rows?.length ? primary.dataContract : secondary.dataContract,
    };
  });
}

function mergeWidgets(current, zustand, projectId, dashboardId, conflicts) {
  const result = current.map((widget) => ({ ...widget, projectId, dashboardId }));
  const indexes = new Map(result.map((widget, index) => [widget.id, index]));
  zustand.forEach((widget) => {
    const existingIndex = indexes.get(widget.id);
    if (typeof existingIndex !== "number") {
      indexes.set(widget.id, result.length);
      result.push({ ...widget, projectId, dashboardId });
      return;
    }
    const existing = result[existingIndex];
    if (existing.kind !== widget.kind) {
      let remappedId = `${widget.id}~zustand`;
      let suffix = 2;
      while (indexes.has(remappedId)) {
        remappedId = `${widget.id}~zustand-${suffix}`;
        suffix += 1;
      }
      conflicts.push(conflict("widget", widget.id, "id", "project-storage"));
      result.push({ ...widget, id: remappedId, projectId, dashboardId });
      indexes.set(remappedId, result.length - 1);
      return;
    }
    if (valuesDiffer(existing, widget)) conflicts.push(conflict("widget", widget.id, "record", "project-storage"));
  });
  return result;
}

function mergeDashboards(current, zustand, projectId, conflicts) {
  return mergeById(current, zustand, (primary, secondary) => {
    ["name", "canvasSettings"].forEach((field) => {
      if (valuesDiffer(primary[field], secondary[field])) conflicts.push(conflict("dashboard", primary.id, field, "project-storage"));
    });
    return {
      ...secondary,
      ...primary,
      projectId,
      legacySheetId: secondary.legacySheetId ?? primary.legacySheetId,
      widgets: mergeWidgets(primary.widgets, secondary.widgets, projectId, primary.id, conflicts),
    };
  });
}

function mergeAliases(current, zustand) {
  return mergeById(
    current.map((alias) => ({ ...alias, id: alias.sheetId })),
    zustand.map((alias) => ({ ...alias, id: alias.sheetId })),
    (primary, secondary) => ({
      ...primary,
      dashboardIds: Array.from(new Set([...asArray(primary.dashboardIds), ...asArray(secondary.dashboardIds)])),
    }),
  ).map((alias) => ({
    sheetId: alias.sheetId,
    name: alias.name,
    dashboardIds: alias.dashboardIds,
  }));
}

function mergeProjects(currentProjects, zustandProjects, conflicts, clock) {
  return mergeById(currentProjects, zustandProjects, (primary, secondary) => {
    if (valuesDiffer(primary.name, secondary.name)) conflicts.push(conflict("project", primary.id, "name", "project-storage"));
    return {
      ...secondary,
      ...primary,
      datasets: mergeDatasets(primary.datasets, secondary.datasets, primary.id, conflicts),
      charts: mergeCharts(primary.charts, secondary.charts, primary.id, conflicts),
      dashboards: mergeDashboards(primary.dashboards, secondary.dashboards, primary.id, conflicts),
      shares: mergeById(primary.shares, secondary.shares, (current, legacy) => {
        if (valuesDiffer(current, legacy)) conflicts.push(conflict("share", current.id, "record", "zustand"));
        return legacy;
      }),
      connectionProfiles: [],
      legacySheetAliases: mergeAliases(primary.legacySheetAliases, secondary.legacySheetAliases),
      updatedAt: timestamp(primary.updatedAt, clock()),
    };
  });
}

function repairReferences(projects, migration) {
  return projects.map((project) => {
    const datasetIds = new Set(project.datasets.map((dataset) => dataset.id));
    const chartIds = new Set(project.charts.map((chart) => chart.id));
    const dashboards = project.dashboards.map((dashboard) => ({
      ...dashboard,
      widgets: dashboard.widgets.map((widget) => {
        if (!widget.chartId || chartIds.has(widget.chartId)) return widget;
        migration.unresolvedReferences.push(`widget ${widget.id} references missing chart ${widget.chartId}`);
        return {
          ...widget,
          chartId: null,
          presentation: { ...widget.presentation, unresolvedChartId: widget.chartId },
        };
      }),
    }));
    const dashboardIds = new Set(dashboards.map((dashboard) => dashboard.id));
    const charts = project.charts.map((chart) => {
      if (chart.dataContract?.sourceType === "demo") return chart;
      if (!chart.datasetId || datasetIds.has(chart.datasetId)) {
        const dataset = project.datasets.find((item) => item.id === chart.datasetId);
        return {
          ...chart,
          dataContract: chart.dataContract?.sourceType === "snapshot" || chart.dataContract?.sourceType === "sql-result"
            ? chart.dataContract
            : {
                ...(chart.dataContract ?? {}),
                sourceType: chart.datasetId ? "dataset" : chart.dataContract?.sourceType ?? "unknown",
                datasetId: chart.datasetId,
                fields: dataset?.fields ?? asArray(chart.dataContract?.fields),
                rows: dataset ? [] : asArray(chart.dataContract?.rows),
              },
        };
      }
      const missingDatasetId = chart.datasetId;
      migration.unresolvedReferences.push(`chart ${chart.id} references missing dataset ${missingDatasetId}`);
      const contract = isObject(chart.dataContract) ? chart.dataContract : {};
      const snapshotRows = asArray(contract.rows);
      return {
        ...chart,
        datasetId: null,
        dataContract: snapshotRows.length
          ? {
              ...contract,
              sourceType: "snapshot",
              datasetId: null,
              unresolvedDatasetId: missingDatasetId,
              fields: asArray(contract.fields),
              rows: snapshotRows,
            }
          : {
              sourceType: "unavailable",
              datasetId: null,
              unresolvedDatasetId: missingDatasetId,
              fields: asArray(contract.fields),
              rows: [],
            },
      };
    });
    const shares = project.shares.map((share) => {
      if (dashboardIds.has(share.dashboardId)) return share;
      migration.unresolvedReferences.push(`share ${share.id} references missing dashboard ${share.dashboardId}`);
      return { ...share, availability: "unavailable" };
    });
    return { ...project, charts, dashboards, shares };
  });
}

function entityCounts(projects) {
  return projects.reduce(
    (counts, project) => {
      counts.projects += 1;
      counts.datasets += project.datasets.length;
      counts.charts += project.charts.length;
      counts.dashboards += project.dashboards.length;
      counts.widgets += project.dashboards.reduce((total, dashboard) => total + dashboard.widgets.length, 0);
      counts.shares += project.shares.length;
      return counts;
    },
    { projects: 0, datasets: 0, charts: 0, dashboards: 0, widgets: 0, shares: 0 },
  );
}

export function fingerprintSourceValue(raw) {
  const value = String(raw ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}-${value.length}`;
}

export function readLegacySourceValues(storage) {
  const warnings = [];
  const errors = [];
  const rawByKey = Object.fromEntries(LEGACY_SOURCE_KEYS.map((key) => {
    try {
      return [key, storage.getItem(key)];
    } catch {
      warnings.push(`${key} could not be read from browser storage and was skipped`);
      errors.push(`${key} could not be read`);
      return [key, null];
    }
  }));
  return { rawByKey, warnings, errors };
}

export function createMigrationCandidate(sourceValues, { clock = () => new Date().toISOString() } = {}) {
  const rawByKey = isObject(sourceValues?.rawByKey) ? sourceValues.rawByKey : {};
  const warnings = Array.isArray(sourceValues?.warnings) ? sourceValues.warnings.map(String) : [];
  const sourceReadErrors = Array.isArray(sourceValues?.errors) ? sourceValues.errors.map(String) : [];
  const conflicts = [];
  const migration = {
    status: "candidate",
    completedAt: null,
    sourceKeys: LEGACY_SOURCE_KEYS.filter((key) => rawByKey[key] !== null && typeof rawByKey[key] !== "undefined"),
    sourceFingerprints: {},
    conflicts,
    warnings,
    unresolvedReferences: [],
  };
  migration.sourceKeys.forEach((key) => {
    migration.sourceFingerprints[key] = fingerprintSourceValue(rawByKey[key]);
  });

  let zustandSource = parseJsonSource(rawByKey["mini-bi-v8-workspace"], "mini-bi-v8-workspace", null, warnings);
  if (zustandSource !== null && !isObject(zustandSource)) {
    warnings.push("mini-bi-v8-workspace has an unsupported root shape and was skipped");
    zustandSource = null;
  }
  let projectStorageSource = parseJsonSource(rawByKey["mini-bi-projects"], "mini-bi-projects", [], warnings);
  if (!Array.isArray(projectStorageSource)) {
    warnings.push("mini-bi-projects has an unsupported root shape and was skipped");
    projectStorageSource = [];
  }
  const zustand = convertZustand(zustandSource, clock, warnings);
  const projectStorage = convertProjectStorage(projectStorageSource, clock, warnings);
  zustand.projects = remapSourceCollisions(zustand.projects, "zustand", conflicts);
  projectStorage.projects = remapSourceCollisions(projectStorage.projects, "project-storage", conflicts);
  let projects = mergeProjects(projectStorage.projects, zustand.projects, conflicts, clock);
  const fallbackResult = applyCompatibilityFallbacks(projects, rawByKey, clock, warnings);
  projects = fallbackResult.projects;
  projects = repairReferences(projects, migration);

  const standaloneProjectId = asString(rawByKey["mini-bi-active-project-id"], "") || null;
  const activeProject = projects.find((project) => project.id === standaloneProjectId)
    ?? projects.find((project) => project.id === zustand.activeProjectId)
    ?? projects[0]
    ?? null;
  if (standaloneProjectId && activeProject?.id !== standaloneProjectId) {
    warnings.push(`active project ${standaloneProjectId} was unavailable; selected ${activeProject?.id ?? "none"}`);
  }
  const standaloneDashboardId = asString(rawByKey["mini-bi-active-dashboard-id"], "") || null;
  const activeDashboard = activeProject?.dashboards.find((dashboard) => dashboard.id === standaloneDashboardId)
    ?? activeProject?.dashboards.find((dashboard) => dashboard.id === zustand.activeDashboardId)
    ?? activeProject?.dashboards[0]
    ?? null;
  if (standaloneDashboardId && activeDashboard?.id !== standaloneDashboardId) {
    warnings.push(`active dashboard ${standaloneDashboardId} was unavailable; selected ${activeDashboard?.id ?? "none"}`);
  }

  const base = createEmptyWorkspace(clock);
  const themePreference = asString(rawByKey["mini-bi-theme"], "");
  if (themePreference && !["light", "dark", "system"].includes(themePreference)) {
    warnings.push(`mini-bi-theme contains an unsupported value and was skipped`);
  }
  const document = normalizeWorkspaceDocument({
    ...base,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    active: { projectId: activeProject?.id ?? null, dashboardId: activeDashboard?.id ?? null },
    projects,
    settings: {
      ...(zustand.settings ?? base.settings),
      ...(["light", "dark", "system"].includes(themePreference) ? { theme: themePreference } : {}),
    },
    migration,
  }, { clock });
  const compatibilityCounts = {
    projects: 0,
    datasets: 0,
    charts: fallbackResult.compatibility.charts.length,
    dashboards: fallbackResult.compatibility.dashboards.length,
    widgets: fallbackResult.compatibility.dashboards.reduce(
      (total, dashboard) => total + dashboard.widgets.length,
      0,
    ),
    shares: 0,
  };
  const counts = entityCounts(document.projects);
  const report = {
    sourceReadErrors,
    before: {
      zustand: entityCounts(zustand.projects),
      projectStorage: entityCounts(projectStorage.projects),
      compatibility: compatibilityCounts,
    },
    after: counts,
    counts,
    references: {
      valid: document.migration.unresolvedReferences.length === 0,
      unresolved: [...document.migration.unresolvedReferences],
    },
  };
  return { document, report };
}

export function validateMigrationCandidate(candidate) {
  if (!isObject(candidate) || !isObject(candidate.document) || !isObject(candidate.report)) {
    return { valid: false, errors: ["migration candidate is incomplete"], warnings: [] };
  }
  const validation = validateWorkspaceDocument(candidate.document);
  const expectedCounts = entityCounts(candidate.document.projects);
  const errors = [...validation.errors];
  if (Array.isArray(candidate.report.sourceReadErrors) && candidate.report.sourceReadErrors.length) {
    errors.push(`legacy source read failed: ${candidate.report.sourceReadErrors.join("; ")}`);
  }
  if (valuesDiffer(expectedCounts, candidate.report.counts)) {
    errors.push("migration candidate entity counts do not match the document");
  }
  if (candidate.report.after && valuesDiffer(expectedCounts, candidate.report.after)) {
    errors.push("migration candidate after counts do not match the document");
  }
  return { valid: errors.length === 0, errors, warnings: validation.warnings };
}
