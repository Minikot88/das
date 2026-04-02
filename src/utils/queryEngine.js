/**
 * queryEngine.js - Frontend query/aggregation engine.
 *
 * EXTENSION: Replace runQuery() with: POST /api/query -> backend/queryEngine.js -> PostgreSQL
 * Cache hit logic stays identical (use Redis on backend instead of in-memory Map).
 */
import { buildCacheKey, getCached, setCached, setLastQueryResult } from "./queryCache";
import { datasets } from "../data/mockData";

const SUPPORTED_AGGREGATES = new Set(["sum", "count", "avg", "min", "max"]);
const RAW_ROW_CHARTS = new Set(["scatter", "bubble", "histogram"]);
const SINGLE_METRIC_CHARTS = new Set(["kpi", "gauge", "progress-ring"]);

function normalizeAggregate(value = "sum") {
  const normalized = String(value || "sum").toLowerCase();
  return SUPPORTED_AGGREGATES.has(normalized) ? normalized : "sum";
}

function resolveQueryParams(params = {}) {
  return {
    table: params.dataset || params.table || null,
    xField: params.x || params.xField || null,
    yField: params.y || params.yField || null,
    groupField: params.groupBy || params.groupField || null,
    sizeField: params.sizeField || params.size || params.sizeBy || null,
    chartType: params.chartType || params.type || null,
    aggregate: normalizeAggregate(params.aggregate || params.aggregateType || "sum"),
    dateRange: params.dateRange ?? null,
    dateField: params.dateField || "",
    categoryField: params.categoryField || "",
    categoryValue: params.categoryValue || "",
    drillFilters: Array.isArray(params.drillFilters) ? params.drillFilters : [],
    detailRows: Boolean(params.detailRows),
  };
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function unquoteIdentifier(identifier = "") {
  return String(identifier).trim().replace(/^"|"$/g, "");
}

function inferPrimitiveType(value) {
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^\d{4}(-\d{2})?(-\d{2})?$/.test(value)) return "date";
  return "string";
}

function buildFieldMeta(columns = [], rows = []) {
  return columns.map((column) => {
    const sample = rows.find((row) => row?.[column] !== null && row?.[column] !== undefined)?.[column];
    return {
      name: column,
      type: inferPrimitiveType(sample),
    };
  });
}

function looksLikeDateField(fieldName = "") {
  return /date|time|year|month|period|cover/i.test(fieldName);
}

function inferDateField(rows = []) {
  const sample = rows[0];
  if (!sample) return null;
  return Object.keys(sample).find((key) => looksLikeDateField(key)) ?? null;
}

function needsRawRows({ chartType, detailRows }) {
  return detailRows || RAW_ROW_CHARTS.has(chartType);
}

function needsSingleMetric({ chartType, xField, yField }) {
  return SINGLE_METRIC_CHARTS.has(chartType) || (!xField && !!yField);
}

function buildAggregateDescriptor({ xField, yField, groupField, aggregate }) {
  const groupColumns = [xField, groupField].filter(Boolean);
  const selectColumns = groupColumns.map((column) => quoteIdentifier(column));
  const chartKey = yField || (xField ? "count" : "value");
  const aggregateSql = yField
    ? `${aggregate.toUpperCase()}(${quoteIdentifier(yField)}) AS ${quoteIdentifier(chartKey)}`
    : `COUNT(*) AS ${quoteIdentifier(chartKey)}`;

  return {
    groupColumns,
    selectColumns,
    chartKey,
    aggregateSql,
  };
}

/** Build a parameterized SQL descriptor from chart params. */
export function buildQuery(params = {}) {
  const resolved = resolveQueryParams(params);
  const {
    table,
    xField,
    yField,
    groupField,
    sizeField,
    chartType,
    aggregate,
    dateRange,
    dateField,
    categoryField,
    categoryValue,
    drillFilters,
    detailRows,
  } = resolved;

  if (!table || (!xField && !yField && !detailRows)) {
    return {
      sql: "",
      params: [],
      columns: [],
      aggregate,
      chartKey: yField || xField || "value",
      groupField,
    };
  }

  const where = [];
  const sqlParams = [];

  if (dateField && dateRange?.start && dateRange?.end) {
    sqlParams.push(dateRange.start, dateRange.end);
    where.push(`${quoteIdentifier(dateField)} BETWEEN $${sqlParams.length - 1} AND $${sqlParams.length}`);
  }

  if (categoryField && categoryValue) {
    sqlParams.push(categoryValue);
    where.push(`${quoteIdentifier(categoryField)} = $${sqlParams.length}`);
  }

  for (const drillFilter of drillFilters) {
    if (!drillFilter?.field || drillFilter?.value === undefined) continue;
    sqlParams.push(drillFilter.value);
    where.push(`${quoteIdentifier(drillFilter.field)} = $${sqlParams.length}`);
  }

  if (needsRawRows({ chartType, detailRows })) {
    const rawColumns = [xField, yField, groupField, sizeField].filter(Boolean).map(quoteIdentifier);
    const selectClause = rawColumns.length ? rawColumns.join(", ") : "*";
    const orderField = xField || groupField || sizeField || drillFilters[0]?.field;

    return {
      sql: [
        `SELECT ${selectClause}`,
        `FROM ${quoteIdentifier(table)}`,
        ...(where.length ? [`WHERE ${where.join("\n  AND ")}`] : []),
        ...(orderField ? [`ORDER BY ${quoteIdentifier(orderField)} ASC;`] : []),
      ].join("\n"),
      params: sqlParams,
      columns: rawColumns.length ? [xField, yField, groupField, sizeField].filter(Boolean) : ["*"],
      aggregate,
      chartKey: yField || xField || sizeField || "value",
      groupField,
    };
  }

  if (needsSingleMetric({ chartType, xField, yField })) {
    const chartKey = yField || "value";
    return {
      sql: [
        `SELECT ${aggregate.toUpperCase()}(${quoteIdentifier(chartKey)}) AS ${quoteIdentifier(chartKey)}`,
        `FROM ${quoteIdentifier(table)}`,
        ...(where.length ? [`WHERE ${where.join("\n  AND ")}`] : []),
        ";",
      ].join("\n"),
      params: sqlParams,
      columns: [chartKey],
      aggregate,
      chartKey,
      groupField,
    };
  }

  const { groupColumns, selectColumns, chartKey, aggregateSql } = buildAggregateDescriptor({
    xField,
    yField,
    groupField,
    aggregate,
  });

  const sql = [
    `SELECT ${[...selectColumns, aggregateSql].join(", ")}`,
    `FROM ${quoteIdentifier(table)}`,
    ...(where.length ? [`WHERE ${where.join("\n  AND ")}`] : []),
    ...(groupColumns.length ? [`GROUP BY ${groupColumns.map(quoteIdentifier).join(", ")}`] : []),
    ...(xField ? [`ORDER BY ${quoteIdentifier(xField)} ASC;`] : [";"]),
  ].join("\n");

  return {
    sql,
    params: sqlParams,
    columns: [...groupColumns, chartKey],
    aggregate,
    chartKey,
    groupField,
  };
}

function splitCommaSegments(input = "") {
  const parts = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if ((char === "'" || char === '"') && input[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      current += char;
      continue;
    }
    if (!quote) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (char === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function normalizeSqlWhitespace(sql = "") {
  return String(sql).replace(/\s+/g, " ").trim();
}

function parseLiteral(token = "") {
  const value = token.trim();
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  return unquoteIdentifier(value);
}

function compareValues(left, operator, right) {
  switch (operator) {
    case "=":
      return String(left) === String(right);
    case "!=":
    case "<>":
      return String(left) !== String(right);
    case ">":
      return Number(left) > Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<":
      return Number(left) < Number(right);
    case "<=":
      return Number(left) <= Number(right);
    default:
      return false;
  }
}

function applyWhereSql(rows = [], whereClause = "") {
  if (!whereClause.trim()) return rows;

  const conditions = whereClause.split(/\s+AND\s+/i).map((item) => item.trim()).filter(Boolean);
  return rows.filter((row) =>
    conditions.every((condition) => {
      const match = condition.match(/^("?[\w]+"?)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/i);
      if (!match) {
        throw new Error(`Unsupported WHERE clause: ${condition}`);
      }
      const [, columnToken, operator, valueToken] = match;
      const column = unquoteIdentifier(columnToken);
      const expected = parseLiteral(valueToken);
      return compareValues(row?.[column], operator, expected);
    })
  );
}

function parseSelectExpression(segment = "") {
  if (/case\s+when/i.test(segment)) {
    throw new Error("CASE WHEN is not supported in the local SQL engine yet.");
  }

  const aliasMatch = segment.match(/^(.*?)(?:\s+AS\s+|\s+)([A-Za-z_][\w$]*)$/i);
  const rawExpression = aliasMatch ? aliasMatch[1].trim() : segment.trim();
  const alias = aliasMatch ? aliasMatch[2].trim() : null;
  const aggregateMatch = rawExpression.match(/^(SUM|COUNT|AVG|MIN|MAX)\s*\((\*|"?[\w]+"?)\)$/i);

  if (aggregateMatch) {
    return {
      kind: "aggregate",
      aggregate: aggregateMatch[1].toLowerCase(),
      column: aggregateMatch[2] === "*" ? "*" : unquoteIdentifier(aggregateMatch[2]),
      alias: alias ?? rawExpression.replace(/\W+/g, "_").toLowerCase(),
      raw: segment,
    };
  }

  if (!/^"?[\w]+"?$/.test(rawExpression)) {
    throw new Error(`Unsupported SELECT expression: ${segment}`);
  }

  const column = unquoteIdentifier(rawExpression);
  return {
    kind: "column",
    column,
    alias: alias ?? column,
    raw: segment,
  };
}

function parseSql(sql = "") {
  const trimmed = String(sql).trim().replace(/;$/, "");
  if (!trimmed) {
    throw new Error("SQL is empty.");
  }
  if (!/^select\s+/i.test(trimmed)) {
    throw new Error("Only SELECT queries are supported.");
  }
  if (/\bjoin\b/i.test(trimmed)) {
    throw new Error("JOIN is not supported in the local SQL engine yet.");
  }

  const normalized = normalizeSqlWhitespace(trimmed);
  const match = normalized.match(
    /^SELECT\s+(.+?)\s+FROM\s+("?[\w]+"?)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i
  );

  if (!match) {
    throw new Error("SQL syntax is not supported by the local SQL engine.");
  }

  const [, selectClause, tableToken, whereClause = "", groupClause = "", orderClause = "", limitClause = ""] = match;
  const selectItems = splitCommaSegments(selectClause).map(parseSelectExpression);
  const groupBy = splitCommaSegments(groupClause).map(unquoteIdentifier).filter(Boolean);
  const orderBy = splitCommaSegments(orderClause)
    .map((segment) => {
      const orderMatch = segment.trim().match(/^("?[\w]+"?)(?:\s+(ASC|DESC))?$/i);
      if (!orderMatch) {
        throw new Error(`Unsupported ORDER BY clause: ${segment}`);
      }
      return {
        column: unquoteIdentifier(orderMatch[1]),
        direction: (orderMatch[2] ?? "ASC").toUpperCase(),
      };
    });

  return {
    table: unquoteIdentifier(tableToken),
    selectItems,
    whereClause,
    groupBy,
    orderBy,
    limit: limitClause ? Number(limitClause) : null,
  };
}

function aggregateSqlValues(values = [], aggregate = "sum") {
  if (aggregate === "count") return values.length;
  if (!values.length) return 0;
  if (aggregate === "avg") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (aggregate === "min") return Math.min(...values);
  if (aggregate === "max") return Math.max(...values);
  return values.reduce((sum, value) => sum + value, 0);
}

function projectSqlRows(rows = [], parsedSql) {
  const hasAggregate = parsedSql.selectItems.some((item) => item.kind === "aggregate");

  if (hasAggregate || parsedSql.groupBy.length) {
    const buckets = new Map();

    rows.forEach((row) => {
      const key = parsedSql.groupBy.length
        ? JSON.stringify(parsedSql.groupBy.map((column) => row?.[column]))
        : "__all__";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    });

    return Array.from(buckets.values()).map((bucket) => {
      const baseRow = bucket[0] ?? {};
      return parsedSql.selectItems.reduce((acc, item) => {
        if (item.kind === "column") {
          acc[item.alias] = baseRow?.[item.column];
          return acc;
        }

        const values = item.column === "*"
          ? bucket.map(() => 1)
          : bucket.map((row) => Number(row?.[item.column]) || 0);
        acc[item.alias] = aggregateSqlValues(values, item.aggregate);
        return acc;
      }, {});
    });
  }

  return rows.map((row) =>
    parsedSql.selectItems.reduce((acc, item) => {
      if (item.kind === "column") {
        acc[item.alias] = row?.[item.column];
        return acc;
      }
      const value = item.column === "*" ? 1 : Number(row?.[item.column]) || 0;
      acc[item.alias] = value;
      return acc;
    }, {})
  );
}

function orderSqlRows(rows = [], orderBy = []) {
  if (!orderBy.length) return rows;
  return [...rows].sort((leftRow, rightRow) => {
    for (const sort of orderBy) {
      const left = leftRow?.[sort.column];
      const right = rightRow?.[sort.column];
      if (left === right) continue;
      const direction = sort.direction === "DESC" ? -1 : 1;
      if (typeof left === "number" && typeof right === "number") {
        return left > right ? direction : -direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    }
    return 0;
  });
}

export function formatSql(sql = "") {
  const trimmed = String(sql).trim().replace(/;$/, "");
  if (!trimmed) return "";

  return trimmed
    .replace(/\bSELECT\b/gi, "SELECT")
    .replace(/\bFROM\b/gi, "\nFROM")
    .replace(/\bWHERE\b/gi, "\nWHERE")
    .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
    .replace(/\bORDER BY\b/gi, "\nORDER BY")
    .replace(/\bLIMIT\b/gi, "\nLIMIT")
    .replace(/,\s*/g, ",\n  ")
    .replace(/\n\s+\n/g, "\n")
    .trim()
    .concat(";");
}

export async function runSqlQuery(sql) {
  const parsedSql = parseSql(sql);
  const key = buildCacheKey({ sql: normalizeSqlWhitespace(sql), mode: "sql" });
  const cached = getCached(key);

  if (cached) {
    const result = {
      data: cached.data,
      cached: true,
      sql: formatSql(sql),
      params: [],
      columns: cached.columns,
      fieldMeta: cached.fieldMeta,
      meta: {
        table: parsedSql.table,
        rowCount: cached.data.length,
        columnCount: cached.columns.length,
        queryMode: "sql",
      },
    };
    setLastQueryResult(result);
    return result;
  }

  await new Promise((resolve) => setTimeout(resolve, 80));

  const sourceRows = datasets[parsedSql.table];
  if (!sourceRows) {
    throw new Error(`Unknown table "${parsedSql.table}"`);
  }

  const filteredRows = applyWhereSql(sourceRows, parsedSql.whereClause);
  const projectedRows = projectSqlRows(filteredRows, parsedSql);
  const orderedRows = orderSqlRows(projectedRows, parsedSql.orderBy);
  const limitedRows = parsedSql.limit != null ? orderedRows.slice(0, parsedSql.limit) : orderedRows;
  const columns = parsedSql.selectItems.map((item) => item.alias);
  const fieldMeta = buildFieldMeta(columns, limitedRows);

  const result = {
    data: limitedRows,
    cached: false,
    sql: formatSql(sql),
    params: [],
    columns,
    fieldMeta,
    meta: {
      table: parsedSql.table,
      rowCount: limitedRows.length,
      columnCount: columns.length,
      queryMode: "sql",
    },
  };

  setCached(key, { data: limitedRows, columns, fieldMeta });
  setLastQueryResult(result);
  return result;
}

function aggregateValues(values = [], aggregate = "sum") {
  if (!values.length) return 0;
  switch (aggregate) {
    case "count":
      return values.length;
    case "avg":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "sum":
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function aggregateData(raw, xField, yField, groupField, aggregate = "sum") {
  if (!xField && yField) {
    return [{ [yField]: parseFloat(aggregateValues(raw.map((row) => Number(row[yField]) || 0), aggregate).toFixed(2)) }];
  }

  if (xField && !yField) {
    const grouped = new Map();
    for (const row of raw) {
      const key = groupField ? `${row[xField]}|||${row[groupField]}` : row[xField];
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([key, count]) => {
      const result = { count };
      if (groupField) {
        const [xValue, groupValue] = key.split("|||");
        result[xField] = xValue;
        result[groupField] = groupValue;
      } else {
        result[xField] = key;
      }
      return result;
    });
  }

  if (!xField || !yField) return raw;

  const grouped = new Map();
  for (const row of raw) {
    const key = groupField ? `${row[xField]}|||${row[groupField]}` : row[xField];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(Number(row[yField]) || 0);
  }

  return Array.from(grouped.entries()).map(([key, values]) => {
    const value = aggregateValues(values, aggregate);
    const result = { [yField]: parseFloat(value.toFixed(2)) };
    if (groupField) {
      const [xValue, groupValue] = key.split("|||");
      result[xField] = xValue;
      result[groupField] = groupValue;
    } else {
      result[xField] = key;
    }
    return result;
  });
}

function formatChartRows(data, { xField, yField, groupField, chartKey }) {
  return data.map((row) => ({
    ...row,
    ...(xField ? { [xField]: row[xField] } : {}),
    ...(groupField ? { [groupField]: row[groupField] } : {}),
    [chartKey]: row[chartKey] ?? row[yField] ?? row[xField],
  }));
}

function applyDrillFilters(rows = [], drillFilters = []) {
  if (!drillFilters.length) return rows;
  return rows.filter((row) =>
    drillFilters.every((filter) => String(row?.[filter.field] ?? "") === String(filter.value ?? ""))
  );
}

/**
 * Run a simulated query with frontend cache.
 * @returns {{ data, cached, sql, params, columns, meta }}
 */
export async function runQuery(params) {
  const query = buildQuery(params);
  const {
    table: tbl,
    xField: xf,
    yField: yf,
    groupField: gf,
    sizeField: sf,
    chartType,
    aggregate: agg,
    dateRange,
    dateField,
    categoryField,
    categoryValue,
    drillFilters,
    detailRows,
  } = resolveQueryParams(params);

  const key = buildCacheKey(params);
  const cached = getCached(key);

  if (cached) {
    const result = {
      data: cached,
      cached: true,
      sql: query.sql,
      params: query.params,
      columns: query.columns,
      fieldMeta: buildFieldMeta(query.columns, cached),
      meta: {
        table: tbl,
        xField: xf,
        yField: yf,
        groupField: gf,
        sizeField: sf,
        chartType,
        aggregate: agg,
        detailRows,
        drillFilters,
        rowCount: cached.length,
      },
    };
    setLastQueryResult(result);
    return result;
  }

  await new Promise((resolve) => setTimeout(resolve, 80));

  const raw = datasets[tbl] ?? [];
  const resolvedDateField = dateField || inferDateField(raw);

  let filtered = raw;
  if (resolvedDateField && dateRange?.start && dateRange?.end) {
    filtered = filtered.filter((row) => {
      const value = row[resolvedDateField];
      if (value === null || value === undefined || value === "") return false;
      return String(value) >= dateRange.start && String(value) <= dateRange.end;
    });
  }

  if (categoryField && categoryValue) {
    filtered = filtered.filter((row) => String(row[categoryField] ?? "") === String(categoryValue));
  }

  filtered = applyDrillFilters(filtered, drillFilters);

  if (needsRawRows({ chartType, detailRows })) {
    const detailData = filtered.map((row) => {
      if (!xf && !yf && !gf && !sf) return { ...row };
      return {
        ...(xf ? { [xf]: row[xf] } : {}),
        ...(yf ? { [yf]: row[yf] } : {}),
        ...(gf ? { [gf]: row[gf] } : {}),
        ...(sf ? { [sf]: row[sf] } : {}),
      };
    });

    setCached(key, detailData);
    const result = {
      data: detailData,
      cached: false,
      sql: query.sql,
      params: query.params,
      columns: query.columns,
      fieldMeta: buildFieldMeta(query.columns, detailData),
      meta: {
        table: tbl,
        xField: xf,
        yField: yf,
        groupField: gf,
        sizeField: sf,
        chartType,
        aggregate: agg,
        dateField: resolvedDateField || "",
        detailRows: needsRawRows({ chartType, detailRows }),
        drillFilters,
        rowCount: detailData.length,
      },
    };
    setLastQueryResult(result);
    return result;
  }

  const aggregated = aggregateData(filtered, xf, yf, gf, agg);
  const data = formatChartRows(aggregated, {
    xField: xf,
    yField: yf,
    groupField: gf,
    chartKey: query.chartKey,
  });

  setCached(key, data);
  const result = {
    data,
    cached: false,
    sql: query.sql,
    params: query.params,
    columns: query.columns,
    fieldMeta: buildFieldMeta(query.columns, data),
    meta: {
      table: tbl,
      xField: xf,
      yField: yf,
      groupField: gf,
      sizeField: sf,
      chartType,
      aggregate: agg,
      dateField: resolvedDateField || "",
      rowCount: data.length,
    },
  };
  setLastQueryResult(result);
  return result;
}

