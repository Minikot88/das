import type { DataField, FieldType, SemanticType } from "../types";
import type { DemoDatasetRow } from "../services/datasetService";

export type SqlValue = string | number | boolean;
export type SqlRow = Record<string, SqlValue>;

export type SqlAggregate = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT";

export interface SqlExample {
  id: string;
  name: string;
  description: string;
  sql: string;
}

export interface SqlSavedQuery extends SqlExample {
  createdAt: string;
  updatedAt: string;
}

export interface SqlQueryResult {
  sql: string;
  rows: SqlRow[];
  previewRows: SqlRow[];
  fields: DataField[];
  columns: string[];
  rowCount: number;
  executionMs: number;
}

export interface SqlQueryError {
  message: string;
  detail?: string;
}

export type SqlExecutionResult =
  | { ok: true; result: SqlQueryResult }
  | { ok: false; error: SqlQueryError };

interface ParsedSql {
  select: SelectExpression[];
  where: WhereCondition[];
  groupBy: string[];
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  limit?: number;
}

interface SelectExpression {
  kind: "field" | "aggregate";
  outputId: string;
  label: string;
  fieldId?: string;
  aggregate?: SqlAggregate;
}

interface WhereCondition {
  fieldId: string;
  operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "IN";
  value: SqlValue | SqlValue[];
}

const UNSUPPORTED_SQL_MESSAGE =
  "ตอนนี้ Demo SQL รองรับ SELECT, WHERE, GROUP BY, ORDER BY และ LIMIT เท่านั้น";

export const sqlExamples: SqlExample[] = [
  {
    id: "monthly-sales",
    name: "Monthly Sales",
    description: "ยอดขายและกำไรรายเดือน",
    sql: `SELECT month, monthNumber, SUM(sales) AS total_sales, SUM(profit) AS total_profit
FROM sales_performance
GROUP BY month, monthNumber
ORDER BY monthNumber ASC
LIMIT 12`,
  },
  {
    id: "sales-by-category",
    name: "Sales by Category",
    description: "สัดส่วนยอดขายตามหมวดหมู่",
    sql: `SELECT category, SUM(sales) AS total_sales, SUM(profit) AS total_profit
FROM sales_performance
GROUP BY category
ORDER BY total_sales DESC`,
  },
  {
    id: "region-performance",
    name: "Region Performance",
    description: "ยอดขายและกำไรแยกตามภูมิภาค",
    sql: `SELECT region, SUM(sales) AS total_sales, AVG(conversionRate) AS avg_conversion
FROM sales_performance
GROUP BY region
ORDER BY total_sales DESC`,
  },
  {
    id: "channel-funnel",
    name: "Channel Funnel",
    description: "ยอดขายและจำนวนลูกค้าตามช่องทาง",
    sql: `SELECT channel, SUM(sales) AS total_sales, SUM(customerCount) AS customers
FROM sales_performance
GROUP BY channel
ORDER BY customers DESC`,
  },
  {
    id: "product-ranking",
    name: "Product Ranking",
    description: "จัดอันดับสินค้าโดยยอดขาย",
    sql: `SELECT product, category, SUM(sales) AS total_sales, SUM(quantity) AS total_quantity
FROM sales_performance
GROUP BY product, category
ORDER BY total_sales DESC
LIMIT 10`,
  },
];

export const defaultSavedSqlQueries: SqlSavedQuery[] = [
  createSavedQuery("saved-monthly-sales", "Monthly Sales", sqlExamples[0].sql, "ยอดขายรายเดือน"),
  createSavedQuery("saved-category-profit", "Category Profit", `SELECT category, SUM(profit) AS total_profit, AVG(profitMargin) AS avg_margin
FROM sales_performance
GROUP BY category
ORDER BY total_profit DESC`, "กำไรตามหมวดหมู่"),
  createSavedQuery("saved-regional-performance", "Regional Performance", sqlExamples[2].sql, "ผลงานตามภูมิภาค"),
  createSavedQuery("saved-top-products", "Top Products", sqlExamples[4].sql, "สินค้าขายดี"),
];

export function runDemoSqlQuery(
  sql: string,
  sourceRows: DemoDatasetRow[],
  sourceFields: DataField[],
): SqlExecutionResult {
  const start = getTime();

  try {
    const parsed = parseSql(sql, sourceFields);
    const filteredRows = sourceRows.filter((row) => matchesWhere(row, parsed.where));
    const projectedRows = projectRows(filteredRows, parsed);
    const orderedRows = sortRows(projectedRows, parsed.orderBy);
    const limitedRows =
      typeof parsed.limit === "number" ? orderedRows.slice(0, parsed.limit) : orderedRows;
    const fields = inferSqlFields(limitedRows, parsed.select, sourceFields);

    return {
      ok: true,
      result: {
        sql,
        rows: limitedRows,
        previewRows: limitedRows.slice(0, 100),
        fields,
        columns: fields.map((field) => field.id),
        rowCount: limitedRows.length,
        executionMs: Math.max(1, Math.round(getTime() - start)),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof SqlParserError ? error.message : "ไม่สามารถรัน SQL Query ได้",
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

export function formatSql(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\bFROM\b/gi, "\nFROM")
    .replace(/\bWHERE\b/gi, "\nWHERE")
    .replace(/\bGROUP BY\b/gi, "\nGROUP BY")
    .replace(/\bORDER BY\b/gi, "\nORDER BY")
    .replace(/\bLIMIT\b/gi, "\nLIMIT")
    .trim();
}

export function inferSqlFields(
  rows: SqlRow[],
  select: SelectExpression[],
  sourceFields: DataField[],
): DataField[] {
  return select.map((expression) => {
    const values = rows.map((row) => row[expression.outputId]).filter((value) => value !== undefined);
    const sourceField = sourceFields.find((field) => field.id === expression.fieldId);
    const type = inferFieldType(expression.outputId, values, sourceField, expression.aggregate);
    const semantic = inferSemanticType(expression.outputId, type, sourceField);

    return {
      id: expression.outputId,
      name: expression.outputId,
      label: expression.label,
      type,
      semanticType: semantic,
      table: "SQL Result",
      description:
        expression.kind === "aggregate"
          ? `${expression.aggregate ?? "COUNT"} จาก ${sourceField?.label ?? expression.fieldId ?? "*"}`
          : sourceField?.description ?? "ฟิลด์จากผลลัพธ์ SQL",
      isMeasure: type === "number" || type === "currency" || type === "percentage",
      isDimension: type === "text" || type === "date" || type === "boolean",
      defaultAggregation:
        type === "percentage"
          ? "Average"
          : type === "number" || type === "currency"
            ? "Sum"
            : "None",
      sampleValues: values.slice(0, 5).map(String),
    };
  });
}

function parseSql(sql: string, sourceFields: DataField[]): ParsedSql {
  const normalized = sql.trim().replace(/;+\s*$/, "");
  const compactSql = normalized.replace(/\s+/g, " ");

  if (!compactSql) {
    throw new SqlParserError("กรุณาใส่ SQL Query");
  }

  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|JOIN|UNION|WITH|HAVING)\b/i.test(compactSql)) {
    throw new SqlParserError(UNSUPPORTED_SQL_MESSAGE);
  }

  const fromMatch = compactSql.match(/^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][\w]*)(.*)$/i);

  if (!fromMatch) {
    throw new SqlParserError(UNSUPPORTED_SQL_MESSAGE);
  }

  const [, selectPart, tableName, clausePart = ""] = fromMatch;

  if (tableName.toLowerCase() !== "sales_performance") {
    throw new SqlParserError("Demo SQL ใช้ตาราง sales_performance เท่านั้น");
  }

  const clauses = extractClauses(clausePart);
  const select = parseSelectList(selectPart, sourceFields);
  const groupBy = clauses.groupBy
    ? splitComma(clauses.groupBy).map((field) => resolveFieldId(field.trim(), sourceFields))
    : [];
  const where = clauses.where ? parseWhereClause(clauses.where, sourceFields) : [];
  const orderBy = clauses.orderBy ? parseOrderBy(clauses.orderBy, sourceFields, select) : undefined;
  const limit = clauses.limit ? parseLimit(clauses.limit) : undefined;

  return {
    select,
    where,
    groupBy,
    orderBy,
    limit,
  };
}

function extractClauses(input: string): {
  where?: string;
  groupBy?: string;
  orderBy?: string;
  limit?: string;
} {
  const rest = input.trim();
  const clauses: {
    key: "where" | "groupBy" | "orderBy" | "limit";
    index: number;
    start: number;
  }[] = [];
  const markerRegex = /\s?(WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT)\s/gi;
  let match = markerRegex.exec(rest);

  while (match) {
    const raw = match[1].toUpperCase().replace(/\s+/g, " ");
    const key =
      raw === "WHERE"
        ? "where"
        : raw === "GROUP BY"
          ? "groupBy"
          : raw === "ORDER BY"
            ? "orderBy"
            : "limit";

    clauses.push({
      key,
      index: match.index,
      start: match.index + match[0].length,
    });
    match = markerRegex.exec(rest);
  }

  if (clauses.length === 0) {
    if (rest.length > 0) {
      throw new SqlParserError(UNSUPPORTED_SQL_MESSAGE);
    }
    return {};
  }

  if (rest.slice(0, clauses[0].index).trim()) {
    throw new SqlParserError(UNSUPPORTED_SQL_MESSAGE);
  }

  return clauses.reduce<Record<string, string>>((acc, clause, index) => {
    const next = clauses[index + 1];
    acc[clause.key] = rest.slice(clause.start, next?.index ?? rest.length).trim();
    return acc;
  }, {});
}

function parseSelectList(input: string, sourceFields: DataField[]): SelectExpression[] {
  return splitComma(input).map((part) => {
    const { expression, alias } = splitAlias(part.trim());
    const aggregateMatch = expression.match(/^(SUM|AVG|MIN|MAX|COUNT)\s*\(\s*(\*|[A-Za-z_][\w]*)\s*\)$/i);

    if (aggregateMatch) {
      const aggregate = aggregateMatch[1].toUpperCase() as SqlAggregate;
      const rawField = aggregateMatch[2];
      const fieldId = rawField === "*" ? undefined : resolveFieldId(rawField, sourceFields);
      const outputId =
        alias ?? `${aggregate.toLowerCase()}_${fieldId ?? "rows"}`.replace(/[^\w]/g, "_");

      return {
        kind: "aggregate",
        aggregate,
        fieldId,
        outputId,
        label: toLabel(outputId),
      };
    }

    const fieldId = resolveFieldId(expression, sourceFields);
    const outputId = alias ?? fieldId;
    const sourceField = sourceFields.find((field) => field.id === fieldId);

    return {
      kind: "field",
      fieldId,
      outputId,
      label: alias ? toLabel(alias) : sourceField?.label ?? toLabel(fieldId),
    };
  });
}

function parseWhereClause(input: string, sourceFields: DataField[]): WhereCondition[] {
  if (/\s+OR\s+/i.test(input)) {
    throw new SqlParserError(UNSUPPORTED_SQL_MESSAGE);
  }

  return input.split(/\s+AND\s+/i).map((condition) => {
    const inMatch = condition.match(/^([A-Za-z_][\w]*)\s+IN\s*\((.+)\)$/i);

    if (inMatch) {
      return {
        fieldId: resolveFieldId(inMatch[1], sourceFields),
        operator: "IN",
        value: splitComma(inMatch[2]).map((value) => parseSqlValue(value.trim())),
      };
    }

    const binaryMatch = condition.match(/^([A-Za-z_][\w]*)\s*(=|!=|>=|<=|>|<)\s*(.+)$/);

    if (!binaryMatch) {
      throw new SqlParserError("รูปแบบ WHERE ไม่ถูกต้อง");
    }

    return {
      fieldId: resolveFieldId(binaryMatch[1], sourceFields),
      operator: binaryMatch[2] as WhereCondition["operator"],
      value: parseSqlValue(binaryMatch[3].trim()),
    };
  });
}

function parseOrderBy(
  input: string,
  sourceFields: DataField[],
  select: SelectExpression[],
): ParsedSql["orderBy"] {
  const [fieldName, directionRaw = "ASC"] = input.trim().split(/\s+/);
  const selectedOutput = select.find(
    (expression) => expression.outputId.toLowerCase() === fieldName.toLowerCase(),
  );
  const field = selectedOutput?.outputId ?? resolveFieldId(fieldName, sourceFields);
  const direction = directionRaw.toLowerCase() === "desc" ? "desc" : "asc";

  return { field, direction };
}

function parseLimit(input: string): number {
  const limit = Number.parseInt(input.trim(), 10);

  if (!Number.isFinite(limit) || limit < 1) {
    throw new SqlParserError("LIMIT ต้องเป็นตัวเลขมากกว่า 0");
  }

  return Math.min(limit, 500);
}

function projectRows(rows: DemoDatasetRow[], parsed: ParsedSql): SqlRow[] {
  const hasAggregate = parsed.select.some((expression) => expression.kind === "aggregate");

  if (hasAggregate || parsed.groupBy.length > 0) {
    const grouped = groupRows(rows, parsed.groupBy);

    return Array.from(grouped.values()).map((groupRowsForKey) => {
      const firstRow = groupRowsForKey[0] ?? {};

      return parsed.select.reduce<SqlRow>((acc, expression) => {
        if (expression.kind === "field" && expression.fieldId) {
          acc[expression.outputId] = toSqlValue(firstRow[expression.fieldId]);
          return acc;
        }

        acc[expression.outputId] = aggregateRows(
          groupRowsForKey,
          expression.aggregate ?? "COUNT",
          expression.fieldId,
        );
        return acc;
      }, {});
    });
  }

  return rows.map((row) =>
    parsed.select.reduce<SqlRow>((acc, expression) => {
      if (expression.fieldId) {
        acc[expression.outputId] = toSqlValue(row[expression.fieldId]);
      }
      return acc;
    }, {}),
  );
}

function groupRows(rows: DemoDatasetRow[], groupBy: string[]): Map<string, DemoDatasetRow[]> {
  if (groupBy.length === 0) {
    return new Map([["__all__", rows]]);
  }

  return rows.reduce<Map<string, DemoDatasetRow[]>>((acc, row) => {
    const key = JSON.stringify(groupBy.map((fieldId) => row[fieldId]));
    const bucket = acc.get(key) ?? [];
    bucket.push(row);
    acc.set(key, bucket);
    return acc;
  }, new Map());
}

function aggregateRows(rows: DemoDatasetRow[], aggregate: SqlAggregate, fieldId?: string): number {
  if (aggregate === "COUNT") {
    return fieldId ? rows.filter((row) => row[fieldId] !== undefined && row[fieldId] !== null).length : rows.length;
  }

  const values = rows.map((row) => Number(row[fieldId ?? ""])).filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }

  if (aggregate === "SUM") {
    return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }

  if (aggregate === "AVG") {
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }

  if (aggregate === "MIN") {
    return Math.min(...values);
  }

  return Math.max(...values);
}

function matchesWhere(row: DemoDatasetRow, conditions: WhereCondition[]): boolean {
  return conditions.every((condition) => {
    const rowValue = toSqlValue(row[condition.fieldId]);

    if (condition.operator === "IN" && Array.isArray(condition.value)) {
      return condition.value.some((value) => compareValues(rowValue, value) === 0);
    }

    const comparison = compareValues(rowValue, condition.value as SqlValue);

    switch (condition.operator) {
      case "=":
        return comparison === 0;
      case "!=":
        return comparison !== 0;
      case ">":
        return comparison > 0;
      case ">=":
        return comparison >= 0;
      case "<":
        return comparison < 0;
      case "<=":
        return comparison <= 0;
      default:
        return false;
    }
  });
}

function sortRows(rows: SqlRow[], orderBy?: ParsedSql["orderBy"]): SqlRow[] {
  if (!orderBy) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    const comparison = compareValues(a[orderBy.field], b[orderBy.field]);
    return orderBy.direction === "desc" ? -comparison : comparison;
  });
}

function compareValues(left: SqlValue | undefined, right: SqlValue | undefined): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return -1;
  if (right === undefined) return 1;

  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), "th");
}

function inferFieldType(
  id: string,
  values: SqlValue[],
  sourceField?: DataField,
  aggregate?: SqlAggregate,
): FieldType {
  if (aggregate) {
    return "number";
  }

  if (sourceField) {
    return sourceField.type;
  }

  if (values.every((value) => typeof value === "number")) {
    return "number";
  }

  if (values.every((value) => typeof value === "boolean")) {
    return "boolean";
  }

  if (values.length > 0 && values.every((value) => looksLikeDate(String(value)))) {
    return "date";
  }

  if (/date|month|year|quarter/i.test(id)) {
    return "date";
  }

  return "text";
}

function inferSemanticType(id: string, type: FieldType, sourceField?: DataField): SemanticType {
  if (sourceField?.semanticType) {
    return sourceField.semanticType;
  }

  if (type === "number" && /(sales|profit|cost|revenue|amount|margin)/i.test(id)) {
    return id.toLowerCase().includes("margin") ? "percentage" : "currency";
  }

  if (type === "number" && /(rate|percent|conversion)/i.test(id)) {
    return "percentage";
  }

  if (type === "date") {
    return "date";
  }

  if (type === "boolean") {
    return "boolean";
  }

  if (type === "geography") {
    return "location";
  }

  if (type === "currency") {
    return "currency";
  }

  if (type === "percentage") {
    return "percentage";
  }

  if (type === "number") {
    return /quantity|count|customers?/i.test(id) ? "quantity" : "score";
  }

  return /product/i.test(id) ? "product" : /channel/i.test(id) ? "channel" : "category";
}

function resolveFieldId(input: string, sourceFields: DataField[]): string {
  const normalized = input.trim().replace(/[`"'[\]]/g, "");
  const field = sourceFields.find((item) => item.id.toLowerCase() === normalized.toLowerCase());

  if (!field) {
    throw new SqlParserError(`ไม่พบฟิลด์ ${normalized}`);
  }

  return field.id;
}

function splitAlias(input: string): { expression: string; alias?: string } {
  const aliasMatch = input.match(/^(.+?)\s+AS\s+([A-Za-z_][\w]*)$/i);

  if (aliasMatch) {
    return {
      expression: aliasMatch[1].trim(),
      alias: aliasMatch[2].trim(),
    };
  }

  return { expression: input.trim() };
}

function splitComma(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (const char of input) {
    if ((char === "'" || char === '"') && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    }

    if (!quote && char === "(") depth += 1;
    if (!quote && char === ")") depth -= 1;

    if (!quote && depth === 0 && char === ",") {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseSqlValue(input: string): SqlValue {
  const trimmed = input.trim();
  const unquoted = trimmed.replace(/^['"]|['"]$/g, "");

  if (/^(true|false)$/i.test(unquoted)) {
    return unquoted.toLowerCase() === "true";
  }

  const numeric = Number(unquoted);
  return Number.isFinite(numeric) && unquoted !== "" ? numeric : unquoted;
}

function toSqlValue(value: unknown): SqlValue {
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return value === undefined || value === null ? "" : String(value);
}

function toLabel(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{2}\/\d{2}\/\d{4}$/.test(value);
}

function createSavedQuery(
  id: string,
  name: string,
  sql: string,
  description: string,
): SqlSavedQuery {
  const now = new Date().toISOString();

  return {
    id,
    name,
    description,
    sql,
    createdAt: now,
    updatedAt: now,
  };
}

function getTime(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

class SqlParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlParserError";
  }
}
