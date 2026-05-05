import { mockDataset } from "../data/mockData.js";
import { mockSchema } from "../data/mockSchema.js";

export const DEFAULT_SQL_CONNECTION_NAME = "Mock Connection";
export const DEFAULT_SQL_NAMESPACE = "analytics";

const AGGREGATE_FUNCTIONS = new Set(["SUM", "AVG", "COUNT", "MIN", "MAX"]);

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function splitTopLevel(input = "", separator = ",") {
  const segments = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if ((char === "'" || char === "\"" || char === "`") && input[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }

    if (!quote) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (char === separator && depth === 0) {
        segments.push(input.slice(start, index).trim());
        start = index + 1;
      }
    }
  }

  const tail = input.slice(start).trim();
  if (tail) segments.push(tail);

  return segments;
}

function isIdentifierBoundary(char) {
  return !char || !/[A-Za-z0-9_]/.test(char);
}

function findTopLevelKeyword(input = "", keyword = "", startIndex = 0) {
  const upper = input.toUpperCase();
  const target = keyword.toUpperCase();
  let depth = 0;
  let quote = null;

  for (let index = startIndex; index <= upper.length - target.length; index += 1) {
    const char = input[index];

    if ((char === "'" || char === "\"" || char === "`") && input[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }

    if (quote) continue;
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) continue;

    if (
      upper.slice(index, index + target.length) === target &&
      isIdentifierBoundary(upper[index - 1]) &&
      isIdentifierBoundary(upper[index + target.length])
    ) {
      return index;
    }
  }

  return -1;
}

function normalizeIdentifier(value = "") {
  return String(value)
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/^\[|\]$/g, "")
    .split(".")
    .at(-1)
    ?.trim() ?? "";
}

function getSchemaFieldMap(schema = mockSchema) {
  return new Map((schema?.fields ?? []).map((field) => [field.name, field]));
}

function toLabel(value = "") {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function toNumeric(value) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function inferFieldTypeFromValue(value) {
  if (typeof value === "number") return { type: "number", sourceType: "number" };
  if (typeof value === "boolean") return { type: "boolean", sourceType: "boolean" };
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return { type: "date", sourceType: "date" };
  }
  return { type: "category", sourceType: typeof value === "string" ? "string" : "string" };
}

function createResultSchema(resultRows = [], fieldMeta = []) {
  if (fieldMeta.length) {
    return {
      datasetId: "query_result",
      name: "Query Result",
      fields: fieldMeta.map((field) => ({
        ...field,
        label: field.label ?? toLabel(field.name),
      })),
    };
  }

  const firstRow = resultRows[0] ?? {};
  return {
    datasetId: "query_result",
    name: "Query Result",
    fields: Object.keys(firstRow).map((key) => ({
      name: key,
      label: toLabel(key),
      ...inferFieldTypeFromValue(firstRow[key]),
    })),
  };
}

function applyAggregate(functionName, rows, fieldName) {
  const normalizedFn = String(functionName).toUpperCase();
  if (normalizedFn === "COUNT") {
    if (fieldName === "*") return rows.length;
    return rows.filter((row) => row?.[fieldName] !== null && row?.[fieldName] !== undefined && row?.[fieldName] !== "").length;
  }

  const values = rows
    .map((row) => row?.[fieldName])
    .filter((value) => value !== null && value !== undefined && value !== "");

  if (!values.length) return 0;

  if (normalizedFn === "SUM") {
    return Number(values.reduce((sum, value) => sum + toNumeric(value), 0).toFixed(2));
  }

  if (normalizedFn === "AVG") {
    return Number((values.reduce((sum, value) => sum + toNumeric(value), 0) / values.length).toFixed(2));
  }

  if (normalizedFn === "MIN") {
    if (typeof values[0] === "number") return Math.min(...values.map((value) => toNumeric(value)));
    return values.slice().sort()[0];
  }

  if (normalizedFn === "MAX") {
    if (typeof values[0] === "number") return Math.max(...values.map((value) => toNumeric(value)));
    return values.slice().sort().at(-1);
  }

  throw new Error(`Unsupported aggregate function: ${functionName}`);
}

function createOrderComparator(orderBy = []) {
  if (!orderBy.length) return null;

  return (left, right) => {
    for (const item of orderBy) {
      const leftValue = left?.[item.field];
      const rightValue = right?.[item.field];

      if (leftValue === rightValue) continue;
      if (leftValue == null) return item.direction === "desc" ? 1 : -1;
      if (rightValue == null) return item.direction === "desc" ? -1 : 1;

      const nextLeft = typeof leftValue === "number" ? leftValue : String(leftValue);
      const nextRight = typeof rightValue === "number" ? rightValue : String(rightValue);

      if (nextLeft < nextRight) return item.direction === "desc" ? 1 : -1;
      if (nextLeft > nextRight) return item.direction === "desc" ? -1 : 1;
    }

    return 0;
  };
}

function parseSelectItem(rawItem, schemaFieldMap) {
  const item = String(rawItem).trim();
  if (!item) {
    throw new Error("Each SELECT item must contain a column or aggregate.");
  }

  if (item === "*") {
    return { kind: "wildcard", alias: "*", raw: item };
  }

  const aggregateMatch = item.match(
    /^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*([A-Za-z_][\w.]*|\*)\s*\)(?:\s+AS\s+([A-Za-z_][\w]*))?(?:\s+([A-Za-z_][\w]*))?$/i
  );

  if (aggregateMatch) {
    const [, fn, sourceField, aliasWithAs, aliasWithoutAs] = aggregateMatch;
    const normalizedSourceField = normalizeIdentifier(sourceField);
    const alias = aliasWithAs || aliasWithoutAs || `${fn.toLowerCase()}_${normalizedSourceField === "*" ? "rows" : normalizedSourceField}`;

    if (normalizedSourceField !== "*" && !schemaFieldMap.has(normalizedSourceField)) {
      throw new Error(`Unknown field "${normalizedSourceField}" in aggregate expression.`);
    }

    return {
      kind: "aggregate",
      functionName: fn.toUpperCase(),
      sourceField: normalizedSourceField,
      alias,
      raw: item,
    };
  }

  const columnMatch = item.match(/^([A-Za-z_][\w.]*)(?:\s+AS\s+([A-Za-z_][\w]*))?(?:\s+([A-Za-z_][\w]*))?$/i);
  if (columnMatch) {
    const [, sourceField, aliasWithAs, aliasWithoutAs] = columnMatch;
    const normalizedSourceField = normalizeIdentifier(sourceField);

    if (!schemaFieldMap.has(normalizedSourceField)) {
      throw new Error(`Unknown field "${normalizedSourceField}" in SELECT.`);
    }

    return {
      kind: "column",
      sourceField: normalizedSourceField,
      alias: aliasWithAs || aliasWithoutAs || normalizedSourceField,
      raw: item,
    };
  }

  throw new Error(`Unable to parse SELECT item "${item}".`);
}

function parseOrderByItem(rawItem, knownFields) {
  const item = String(rawItem).trim();
  const match = item.match(/^([A-Za-z_][\w]*)(?:\s+(ASC|DESC))?$/i);
  if (!match) {
    throw new Error(`Unable to parse ORDER BY item "${item}".`);
  }

  const [, fieldName, direction] = match;
  if (!knownFields.has(fieldName)) {
    throw new Error(`ORDER BY field "${fieldName}" is not available in the query result.`);
  }

  return {
    field: fieldName,
    direction: String(direction || "ASC").toLowerCase(),
  };
}

function parseSql(sql = "", schema = mockSchema, dataset = mockDataset) {
  const trimmedSql = String(sql).trim().replace(/;+\s*$/, "");
  if (!trimmedSql) {
    throw new Error("Write a SQL query before running it.");
  }

  if (!/^SELECT\b/i.test(trimmedSql)) {
    throw new Error("Only SELECT queries are supported in mock SQL mode.");
  }

  const fromIndex = findTopLevelKeyword(trimmedSql, "FROM");
  if (fromIndex === -1) {
    throw new Error("A FROM clause is required.");
  }

  const groupByIndex = findTopLevelKeyword(trimmedSql, "GROUP BY", fromIndex + 4);
  const orderByIndex = findTopLevelKeyword(trimmedSql, "ORDER BY", fromIndex + 4);
  const limitIndex = findTopLevelKeyword(trimmedSql, "LIMIT", fromIndex + 4);
  const clauseIndexes = [groupByIndex, orderByIndex, limitIndex].filter((value) => value !== -1).sort((left, right) => left - right);
  const firstTrailingClause = clauseIndexes[0] ?? trimmedSql.length;
  const schemaFieldMap = getSchemaFieldMap(schema);

  const selectRaw = trimmedSql.slice("SELECT".length, fromIndex).trim();
  const fromRaw = trimmedSql.slice(fromIndex + "FROM".length, firstTrailingClause).trim();
  const groupByRaw = groupByIndex === -1
    ? ""
    : trimmedSql.slice(
        groupByIndex + "GROUP BY".length,
        [orderByIndex, limitIndex].filter((value) => value !== -1 && value > groupByIndex).sort((left, right) => left - right)[0] ?? trimmedSql.length
      ).trim();
  const orderByRaw = orderByIndex === -1
    ? ""
    : trimmedSql.slice(
        orderByIndex + "ORDER BY".length,
        [limitIndex].filter((value) => value !== -1 && value > orderByIndex)[0] ?? trimmedSql.length
      ).trim();
  const limitRaw = limitIndex === -1 ? "" : trimmedSql.slice(limitIndex + "LIMIT".length).trim();

  const datasetTokens = fromRaw.split(".").map((token) => normalizeIdentifier(token)).filter(Boolean);
  const resolvedTableName = datasetTokens.at(-1);
  if (!resolvedTableName) {
    throw new Error("FROM must point to a dataset table.");
  }

  if (resolvedTableName !== dataset.id) {
    throw new Error(`Mock SQL can only query "${dataset.id}" right now.`);
  }

  const selectItems = splitTopLevel(selectRaw).map((item) => parseSelectItem(item, schemaFieldMap));
  const hasWildcard = selectItems.some((item) => item.kind === "wildcard");
  const aggregates = selectItems.filter((item) => item.kind === "aggregate");
  const columns = selectItems.filter((item) => item.kind === "column");

  if (hasWildcard && selectItems.length > 1) {
    throw new Error("SELECT * cannot be combined with other columns in mock SQL mode.");
  }

  const groupBy = splitTopLevel(groupByRaw)
    .map((item) => normalizeIdentifier(item))
    .filter(Boolean);

  if (aggregates.length && columns.length && !groupBy.length) {
    throw new Error("Add GROUP BY when mixing plain columns with aggregate functions.");
  }

  if (groupBy.length && columns.some((column) => !groupBy.includes(column.sourceField))) {
    throw new Error("Every non-aggregated column must also appear in GROUP BY.");
  }

  const knownFields = new Set([
    ...columns.map((item) => item.alias),
    ...aggregates.map((item) => item.alias),
    ...columns.map((item) => item.sourceField),
    ...aggregates.map((item) => item.sourceField).filter(Boolean),
    ...(hasWildcard ? Array.from(schemaFieldMap.keys()) : []),
  ]);

  const orderBy = splitTopLevel(orderByRaw)
    .filter(Boolean)
    .map((item) => parseOrderByItem(item, knownFields));

  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;
  if (limitRaw && (!Number.isFinite(limit) || limit < 0)) {
    throw new Error("LIMIT must be a positive integer.");
  }

  return {
    sql: trimmedSql,
    selectItems,
    aggregates,
    columns,
    groupBy,
    orderBy,
    limit,
    tableName: resolvedTableName,
  };
}

function projectWildcardRows(rows = [], schema = mockSchema) {
  return {
    rows: rows.map((row) => ({ ...row })),
    schema: {
      datasetId: "query_result",
      name: "Query Result",
      fields: (schema?.fields ?? []).map((field) => ({
        ...field,
        label: field.label ?? toLabel(field.name),
      })),
    },
  };
}

function executeProjectionQuery(parsedQuery, rows = [], schema = mockSchema) {
  if (parsedQuery.selectItems.some((item) => item.kind === "wildcard")) {
    let resultRows = projectWildcardRows(rows, schema).rows;
    const orderComparator = createOrderComparator(parsedQuery.orderBy);
    if (orderComparator) resultRows = resultRows.slice().sort(orderComparator);
    if (parsedQuery.limit != null) resultRows = resultRows.slice(0, parsedQuery.limit);
    return {
      rows: resultRows,
      schema: projectWildcardRows(resultRows, schema).schema,
    };
  }

  let resultRows = rows.map((row) =>
    Object.fromEntries(
      parsedQuery.selectItems.map((item) => [item.alias, row?.[item.sourceField] ?? null])
    )
  );

  const orderComparator = createOrderComparator(parsedQuery.orderBy);
  if (orderComparator) resultRows = resultRows.slice().sort(orderComparator);
  if (parsedQuery.limit != null) resultRows = resultRows.slice(0, parsedQuery.limit);

  const schemaFieldMap = getSchemaFieldMap(schema);
  const fieldMeta = parsedQuery.selectItems.map((item) => {
    const field = schemaFieldMap.get(item.sourceField);
    return {
      name: item.alias,
      label: toLabel(item.alias),
      type: field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).type,
      sourceType: field?.sourceType ?? field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).sourceType,
    };
  });

  return {
    rows: resultRows,
    schema: createResultSchema(resultRows, fieldMeta),
  };
}

function executeAggregateQuery(parsedQuery, rows = [], schema = mockSchema) {
  const groupedRows = new Map();

  if (!parsedQuery.groupBy.length) {
    groupedRows.set("__all__", rows);
  } else {
    rows.forEach((row) => {
      const key = JSON.stringify(parsedQuery.groupBy.map((fieldName) => row?.[fieldName] ?? null));
      if (!groupedRows.has(key)) groupedRows.set(key, []);
      groupedRows.get(key).push(row);
    });
  }

  let resultRows = Array.from(groupedRows.values()).map((bucket) => {
    const resultRow = {};

    parsedQuery.selectItems.forEach((item) => {
      if (item.kind === "column") {
        resultRow[item.alias] = bucket[0]?.[item.sourceField] ?? null;
        return;
      }

      if (item.kind === "aggregate") {
        resultRow[item.alias] = applyAggregate(item.functionName, bucket, item.sourceField);
      }
    });

    return resultRow;
  });

  const orderComparator = createOrderComparator(parsedQuery.orderBy);
  if (orderComparator) resultRows = resultRows.slice().sort(orderComparator);
  if (parsedQuery.limit != null) resultRows = resultRows.slice(0, parsedQuery.limit);

  const schemaFieldMap = getSchemaFieldMap(schema);
  const fieldMeta = parsedQuery.selectItems.map((item) => {
    if (item.kind === "column") {
      const field = schemaFieldMap.get(item.sourceField);
      return {
        name: item.alias,
        label: toLabel(item.alias),
        type: field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).type,
        sourceType: field?.sourceType ?? field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).sourceType,
      };
    }

    if (item.functionName === "MIN" || item.functionName === "MAX") {
      const field = schemaFieldMap.get(item.sourceField);
      return {
        name: item.alias,
        label: toLabel(item.alias),
        type: field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).type,
        sourceType: field?.sourceType ?? field?.type ?? inferFieldTypeFromValue(resultRows[0]?.[item.alias]).sourceType,
      };
    }

    return {
      name: item.alias,
      label: toLabel(item.alias),
      type: "number",
      sourceType: "number",
    };
  });

  return {
    rows: resultRows,
    schema: createResultSchema(resultRows, fieldMeta),
  };
}

export function executeMockSql({
  sql,
  rows = mockDataset.rows,
  schema = mockSchema,
  dataset = mockDataset,
} = {}) {
  const parsedQuery = parseSql(sql, schema, dataset);
  const hasAggregates = parsedQuery.aggregates.length > 0;
  const result = hasAggregates
    ? executeAggregateQuery(parsedQuery, rows, schema)
    : executeProjectionQuery(parsedQuery, rows, schema);

  return {
    sql: parsedQuery.sql,
    rows: result.rows,
    schema: result.schema,
    queryResult: {
      rows: result.rows,
      columns: result.schema.fields.map((field) => field.name),
      fieldMeta: result.schema.fields,
      rowCount: result.rows.length,
      columnCount: result.schema.fields.length,
      sourceTable: dataset.id,
    },
  };
}

function buildAggregateSelect(fieldName, aggregation = "sum", alias = fieldName) {
  const fn = String(aggregation || "sum").toUpperCase();
  if (fn === "COUNT") return `COUNT(${fieldName ? fieldName : "*"}) AS ${alias}`;
  return `${fn}(${fieldName}) AS ${alias}`;
}

function buildGroupQuery({ tableName, dimensions = [], measures = [], orderBy = [] }) {
  const selectItems = [...dimensions, ...measures].filter(Boolean);
  const groupBy = dimensions.length ? ` GROUP BY ${dimensions.join(", ")}` : "";
  const order = orderBy.length ? ` ORDER BY ${orderBy.join(", ")}` : "";
  return `SELECT ${selectItems.join(", ")} FROM ${tableName}${groupBy}${order}`;
}

export function generateVisualSql({
  template = null,
  mapping = {},
  settings = {},
  dataset = mockDataset,
} = {}) {
  if (!template) return "";

  const tableName = dataset.id;
  const aggregation = String(settings.aggregation || template.defaultSettings?.aggregation || "sum").toLowerCase();
  const x = ensureArray(mapping.x)[0];
  const y = ensureArray(mapping.y)[0];
  const series = ensureArray(mapping.series)[0];
  const measures = ensureArray(mapping.measures);
  const label = ensureArray(mapping.label)[0];
  const value = ensureArray(mapping.value)[0];
  const min = ensureArray(mapping.min)[0];
  const max = ensureArray(mapping.max)[0];
  const bar = ensureArray(mapping.bar)[0];
  const line = ensureArray(mapping.line)[0];
  const size = ensureArray(mapping.size)[0];

  if (template.family === "bar" || template.family === "line" || template.family === "area") {
    if (template.family === "bar" && template.variant === "floating" && x && min && max) {
      return buildGroupQuery({
        tableName,
        dimensions: [x, series].filter(Boolean),
        measures: [buildAggregateSelect(min, aggregation, min), buildAggregateSelect(max, aggregation, max)],
        orderBy: [x].filter(Boolean),
      });
    }

    if (template.family === "line" && template.variant === "multi-axis" && x && measures.length) {
      return buildGroupQuery({
        tableName,
        dimensions: [x],
        measures: measures.map((fieldName) => buildAggregateSelect(fieldName, aggregation, fieldName)),
        orderBy: [x],
      });
    }

    if (template.family === "line" && template.variant === "multi" && x && measures.length > 1) {
      return buildGroupQuery({
        tableName,
        dimensions: [x],
        measures: measures.map((fieldName) => buildAggregateSelect(fieldName, aggregation, fieldName)),
        orderBy: [x],
      });
    }

    if (x && y) {
      return buildGroupQuery({
        tableName,
        dimensions: [x, series].filter(Boolean),
        measures: [buildAggregateSelect(y, aggregation, y)],
        orderBy: [x].filter(Boolean),
      });
    }
  }

  if (["pie", "doughnut", "polar-area", "radar"].includes(template.family)) {
    if (label && measures.length > 1) {
      return buildGroupQuery({
        tableName,
        dimensions: [label],
        measures: measures.map((fieldName) => buildAggregateSelect(fieldName, aggregation, fieldName)),
        orderBy: [label],
      });
    }

    if (label && value) {
      return buildGroupQuery({
        tableName,
        dimensions: [label],
        measures: [buildAggregateSelect(value, aggregation, value)],
        orderBy: [value ? `${value} DESC` : label].filter(Boolean),
      });
    }
  }

  if (template.family === "scatter") {
    const selectItems = [x, y, series].filter(Boolean).join(", ");
    return selectItems ? `SELECT ${selectItems} FROM ${tableName} LIMIT 250` : "";
  }

  if (template.family === "bubble") {
    const selectItems = [x, y, size, series].filter(Boolean).join(", ");
    return selectItems ? `SELECT ${selectItems} FROM ${tableName} LIMIT 250` : "";
  }

  if (template.family === "mixed" && x && bar && line) {
    return buildGroupQuery({
      tableName,
      dimensions: [x, series].filter(Boolean),
      measures: [buildAggregateSelect(bar, aggregation, bar), buildAggregateSelect(line, aggregation, line)],
      orderBy: [x],
    });
  }

  return `SELECT * FROM ${tableName} LIMIT 100`;
}
