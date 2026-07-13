function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSourceType(value) {
  if (value === "demo-sql" || value === "sql-result") return "sql-result";
  if (["dataset", "snapshot", "demo", "unavailable", "unknown"].includes(value)) return value;
  return "unknown";
}

export function createChartDataContract({ sourceType, datasetId = null, rows = [], fields = [], queryText = "" } = {}) {
  const normalizedSource = normalizeSourceType(sourceType);
  if (normalizedSource === "dataset") {
    return {
      sourceType: "dataset",
      datasetId: datasetId || null,
      fields: clone(fields),
      rows: [],
    };
  }
  if (normalizedSource === "sql-result") {
    return {
      sourceType: "sql-result",
      datasetId: null,
      fields: clone(fields),
      rows: clone(rows),
      ...(queryText ? { queryText } : {}),
    };
  }
  if (normalizedSource === "snapshot") {
    return {
      sourceType: "snapshot",
      datasetId: null,
      fields: clone(fields),
      rows: clone(rows),
    };
  }
  if (normalizedSource === "demo") {
    return {
      sourceType: "demo",
      datasetId: datasetId || "sales_performance",
      fields: clone(fields),
      rows: [],
    };
  }
  if (normalizedSource === "unavailable") {
    return {
      sourceType: "unavailable",
      datasetId: null,
      fields: clone(fields),
      rows: [],
    };
  }
  return { sourceType: "unknown", datasetId: null, fields: [], rows: [] };
}

export function normalizeChartDataContract(chart) {
  const existing = chart?.dataContract;
  const config = chart?.config && typeof chart.config === "object" ? chart.config : {};
  if (existing && typeof existing === "object") {
    const recoverableDemo = existing.sourceType === "unavailable" && config.sourceType === "demo";
    return createChartDataContract({
      sourceType: recoverableDemo ? "demo" : existing.sourceType,
      datasetId: recoverableDemo
        ? config.datasetId ?? existing.unresolvedDatasetId
        : existing.datasetId ?? chart?.datasetId,
      fields: asArray(existing.fields),
      rows: asArray(existing.rows),
      queryText: existing.queryText ?? existing.query?.text ?? "",
    });
  }
  return createChartDataContract({
    sourceType: config.sourceType,
    datasetId: config.datasetId ?? chart?.datasetId,
    fields: asArray(config.sqlResultSchema ?? config.fields),
    rows: asArray(config.sqlResultRows ?? config.rows),
    queryText: config.sqlQuery ?? "",
  });
}

export function validateChartConfiguration(chart, fields = []) {
  const errors = [];
  if (!chart?.chartType && !chart?.config?.chartType) {
    errors.push(`Chart ${String(chart?.id ?? "unknown")} has no chart type.`);
  }
  const fieldIds = new Set(fields.map((field) => String(field?.id ?? field?.name ?? "")).filter(Boolean));
  const mappings = asArray(chart?.config?.mappings ?? chart?.config?.fieldMappings);
  mappings.forEach((mapping) => {
    const mappingId = String(mapping?.id ?? mapping?.slot ?? "unknown");
    asArray(mapping?.fields).forEach((field) => {
      const fieldId = typeof field === "string" ? field : String(field?.id ?? field?.name ?? "");
      if (fieldId && !fieldIds.has(fieldId)) {
        errors.push(`Chart ${String(chart?.id ?? "unknown")} mapping ${mappingId} references missing field ${fieldId}.`);
      }
    });
  });
  return { valid: errors.length === 0, errors };
}

function result(status, sourceType, datasetId, rows, fields, message = "") {
  return {
    status,
    sourceType,
    datasetId,
    rows: clone(rows),
    fields: clone(fields),
    message,
  };
}

function validatedResult(chart, sourceType, datasetId, rows, fields, emptyMessage) {
  const validation = validateChartConfiguration(chart, fields);
  if (!validation.valid) return result("invalid", sourceType, datasetId, [], fields, validation.errors.join(" "));
  if (!rows.length) return result("empty", sourceType, datasetId, [], fields, emptyMessage);
  return result("ready", sourceType, datasetId, rows, fields);
}

export function resolveChartData(workspace, chart, { demoResolver } = {}) {
  const contract = normalizeChartDataContract(chart);
  if (contract.sourceType === "dataset") {
    const projects = asArray(workspace?.projects);
    const project = projects.find((item) => item.id === chart?.projectId)
      ?? projects.find((item) => item.datasets?.some((dataset) => dataset.id === contract.datasetId));
    const dataset = project?.datasets?.find((item) => item.id === contract.datasetId);
    if (!dataset) {
      return result(
        "unavailable",
        "dataset",
        contract.datasetId,
        [],
        [],
        `Dataset ${String(contract.datasetId)} is unavailable for chart ${String(chart?.id)}.`,
      );
    }
    return validatedResult(
      chart,
      "dataset",
      dataset.id,
      asArray(dataset.rows),
      asArray(dataset.fields),
      `Dataset ${dataset.id} has no rows.`,
    );
  }

  if (contract.sourceType === "sql-result" || contract.sourceType === "snapshot") {
    return validatedResult(
      chart,
      contract.sourceType,
      null,
      contract.rows,
      contract.fields,
      `Chart ${String(chart?.id)} has an empty ${contract.sourceType} snapshot.`,
    );
  }

  if (contract.sourceType === "demo") {
    if (typeof demoResolver !== "function") {
      return result("unavailable", "demo", contract.datasetId, [], [], "Explicit demo data is unavailable.");
    }
    const demo = demoResolver(contract.datasetId);
    return validatedResult(
      chart,
      "demo",
      contract.datasetId,
      asArray(demo?.rows),
      asArray(demo?.fields),
      `Demo dataset ${String(contract.datasetId)} has no rows.`,
    );
  }

  return result(
    "unavailable",
    contract.sourceType,
    contract.datasetId,
    [],
    [],
    `Chart ${String(chart?.id)} has no available data contract.`,
  );
}
