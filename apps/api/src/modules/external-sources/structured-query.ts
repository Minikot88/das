import { ApiError } from '../../shared/http/api-error.js';

type ColumnMetadata = {
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
};

type TableMetadata = {
  schema: string;
  table: string;
  columns: Record<string, ColumnMetadata>;
};

export type StructuredQueryMetadata = {
  allowedSchemas: Set<string>;
  tables: Record<string, TableMetadata>;
};

type FieldReference = {
  tableAlias: string;
  column: string;
};

type TableReference = {
  schema: string;
  table: string;
  alias: string;
};

type JoinDefinition = {
  left: TableReference & { column: string };
  right: TableReference & { column: string };
  operator?: 'eq';
  joinType: 'inner' | 'left';
};

type CalculatedExpression =
  | { kind: 'arithmetic'; operator: 'add' | 'subtract' | 'multiply' | 'divide'; left: FieldReference; right: FieldReference }
  | { kind: 'datePart'; part: 'year' | 'month' | 'day'; field: FieldReference }
  | { kind: 'concat'; fields: FieldReference[]; separator?: string }
  | { kind: 'ratio'; numerator: FieldReference; denominator: FieldReference }
  | { kind: 'countDistinct'; field: FieldReference }
  | { kind: 'case'; field: FieldReference; operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; value: unknown; then: string | number | boolean; else: string | number | boolean };

export type StructuredExternalQuery = {
  sourceSchema: string;
  baseTable: string;
  selectedTables: TableReference[];
  selectedFields: Array<FieldReference & { alias?: string; cast?: { targetType: 'numeric' | 'date' | 'text'; format?: string } }>;
  joins?: JoinDefinition[];
  filters?: Array<{ field: FieldReference; operator: string; value?: unknown }>;
  groupBy?: FieldReference[];
  aggregations?: Array<{ field: FieldReference; operation: 'count' | 'countDistinct' | 'sum' | 'avg' | 'min' | 'max'; alias?: string }>;
  sorting?: Array<{ field: FieldReference | { alias: string }; direction: 'asc' | 'desc' }>;
  rowLimit?: number;
  page?: number;
  pageSize?: number;
  semanticTypeOverrides?: Record<string, string>;
  calculatedFields?: Array<{ name: string; resultType: string; expression: CalculatedExpression }>;
};

const safeName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const numericTypes = /^(smallint|integer|bigint|numeric|decimal|real|double precision|money)$/i;
const textTypes = /^(text|character varying|character|varchar|char|citext)$/i;
const dateTypes = /^(date|timestamp|timestamp without time zone|timestamp with time zone|time|time without time zone|time with time zone)$/i;
const booleanTypes = /^boolean$/i;
const filterOperators: Record<string, string> = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };

function fail(code: string, message: string): never {
  throw new ApiError(400, code, message);
}

function assertIdentifier(value: string, code: string) {
  if (!safeName.test(value)) fail(code, 'Structured query contains an invalid identifier.');
}

function typeFamily(dataType: string) {
  if (numericTypes.test(dataType)) return 'numeric';
  if (textTypes.test(dataType)) return 'text';
  if (dateTypes.test(dataType)) return 'date';
  if (booleanTypes.test(dataType)) return 'boolean';
  return dataType.toLowerCase();
}

function compatibleJoinTypes(left: string, right: string) {
  return typeFamily(left) === typeFamily(right);
}

export function buildStructuredExternalQuery(input: StructuredExternalQuery, metadata: StructuredQueryMetadata) {
  if ('rawSql' in (input as unknown as Record<string, unknown>)) fail('RAW_SQL_FORBIDDEN', 'Raw SQL is not accepted.');
  if (!Array.isArray(input.selectedTables) || !input.selectedTables.length) fail('TABLE_REQUIRED', 'Select a base table.');
  if (input.selectedTables.length > 6) fail('TABLE_LIMIT_EXCEEDED', 'A dataset can use at most six tables.');

  const aliases = new Set<string>();
  for (const table of input.selectedTables) {
    [table.schema, table.table, table.alias].forEach(value => assertIdentifier(value, 'INVALID_IDENTIFIER'));
    if (!metadata.allowedSchemas.has(table.schema.toLowerCase())) fail('EXTERNAL_SCHEMA_FORBIDDEN', 'Schema is not allowed.');
    if (aliases.has(table.alias)) fail('DUPLICATE_TABLE_ALIAS', 'Table aliases must be unique.');
    aliases.add(table.alias);
    const known = metadata.tables[table.alias];
    if (!known || known.schema !== table.schema || known.table !== table.table) fail('INVALID_TABLE', 'Selected table is not allowed.');
  }

  const base = input.selectedTables.find(table => table.table === input.baseTable && table.schema === input.sourceSchema);
  if (!base) fail('INVALID_BASE_TABLE', 'Base table must be one of the selected tables.');

  const tableFor = (alias: string) => {
    const table = metadata.tables[alias];
    if (!table || !aliases.has(alias)) fail('INVALID_TABLE_ALIAS', 'Field references an unknown table alias.');
    return table;
  };
  const columnFor = (field: FieldReference) => {
    assertIdentifier(field.tableAlias, 'INVALID_TABLE_ALIAS');
    assertIdentifier(field.column, 'INVALID_COLUMN');
    const column = tableFor(field.tableAlias).columns[field.column];
    if (!column) fail('INVALID_COLUMN', `Column ${field.tableAlias}.${field.column} is not allowed.`);
    return column;
  };
  const fieldSql = (field: FieldReference) => {
    columnFor(field);
    return `${quote(field.tableAlias)}.${quote(field.column)}`;
  };

  const joins = input.joins ?? [];
  const connected = new Set([base.alias]);
  const joinSql: string[] = [];
  for (const join of joins) {
    if (!['inner', 'left'].includes(join.joinType)) fail('INVALID_JOIN_TYPE', 'Only INNER JOIN and LEFT JOIN are supported.');
    if ((join.operator ?? 'eq') !== 'eq') fail('INVALID_JOIN_OPERATOR', 'Only equality joins are supported.');
    const left = { tableAlias: join.left.alias, column: join.left.column };
    const right = { tableAlias: join.right.alias, column: join.right.column };
    const leftColumn = columnFor(left);
    const rightColumn = columnFor(right);
    if (!compatibleJoinTypes(leftColumn.dataType, rightColumn.dataType)) {
      fail('INCOMPATIBLE_JOIN_TYPES', `ฟิลด์ ${join.left.alias}.${join.left.column} (${leftColumn.dataType}) และ ${join.right.alias}.${join.right.column} (${rightColumn.dataType}) มี Physical Type ไม่เข้ากัน`);
    }
    if (!connected.has(join.left.alias) && !connected.has(join.right.alias)) fail('DISCONNECTED_JOIN', 'Join must connect to an already selected table.');
    const joiningAlias = connected.has(join.left.alias) ? join.right.alias : join.left.alias;
    const joiningTable = input.selectedTables.find(table => table.alias === joiningAlias);
    if (!joiningTable) fail('INVALID_TABLE_ALIAS', 'Join references an unknown table.');
    connected.add(join.left.alias);
    connected.add(join.right.alias);
    joinSql.push(`${join.joinType.toUpperCase()} JOIN ${quote(joiningTable.schema)}.${quote(joiningTable.table)} AS ${quote(joiningAlias)} ON ${fieldSql(left)} = ${fieldSql(right)}`);
  }
  if (input.selectedTables.some(table => !connected.has(table.alias))) fail('MISSING_JOIN', 'Every selected table must have a validated join path.');

  const castField = (field: StructuredExternalQuery['selectedFields'][number]) => {
    const source = fieldSql(field);
    if (!field.cast) return source;
    if (field.cast.targetType === 'numeric') return `CASE WHEN ${source}::text ~ '^[+-]?(\\d+(\\.\\d+)?|\\.\\d+)$' THEN ${source}::numeric ELSE NULL END`;
    if (field.cast.targetType === 'date') return `CASE WHEN ${source}::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ${source}::date ELSE NULL END`;
    if (field.cast.targetType === 'text') return `${source}::text`;
    return fail('UNSAFE_CAST', 'Unsupported safe cast.');
  };

  const values: unknown[] = [];
  const calculatedSql = (calculated: NonNullable<StructuredExternalQuery['calculatedFields']>[number]) => {
    assertIdentifier(calculated.name, 'INVALID_CALCULATED_FIELD');
    const expression = calculated.expression;
    if (expression.kind === 'ratio') return `(${fieldSql(expression.numerator)}::numeric / NULLIF(${fieldSql(expression.denominator)}, 0))`;
    if (expression.kind === 'arithmetic') {
      const operators = { add: '+', subtract: '-', multiply: '*', divide: '/' } as const;
      const left = columnFor(expression.left);
      const right = columnFor(expression.right);
      if (typeFamily(left.dataType) !== 'numeric' || typeFamily(right.dataType) !== 'numeric') fail('INVALID_CALCULATED_FIELD_TYPES', 'Arithmetic requires numeric fields.');
      const rightSql = expression.operator === 'divide' ? `NULLIF(${fieldSql(expression.right)}, 0)` : fieldSql(expression.right);
      return `(${fieldSql(expression.left)} ${operators[expression.operator]} ${rightSql})`;
    }
    if (expression.kind === 'datePart') return `EXTRACT(${expression.part.toUpperCase()} FROM ${fieldSql(expression.field)})`;
    if (expression.kind === 'concat') {
      if (!expression.fields.length) fail('INVALID_CALCULATED_FIELD', 'Concatenate requires at least one field.');
      const separator = String(expression.separator ?? ' ').replaceAll("'", "''");
      return `concat_ws('${separator}', ${expression.fields.map(field => `${fieldSql(field)}::text`).join(', ')})`;
    }
    if (expression.kind === 'countDistinct') return `COUNT(DISTINCT ${fieldSql(expression.field)})`;
    if (expression.kind === 'case') {
      const operator = filterOperators[expression.operator];
      if (!operator) fail('INVALID_CALCULATED_FIELD', 'CASE uses an unsupported operator.');
      values.push(expression.value, expression.then, expression.else);
      return `(CASE WHEN ${fieldSql(expression.field)} ${operator} $${values.length - 2} THEN $${values.length - 1} ELSE $${values.length} END)`;
    }
    return fail('INVALID_CALCULATED_FIELD', 'Unsupported calculated field expression.');
  };

  const projections = input.selectedFields.map(field => {
    const alias = field.alias || `${field.tableAlias}_${field.column}`;
    assertIdentifier(alias, 'INVALID_FIELD_ALIAS');
    return `${castField(field)} AS ${quote(alias)}`;
  });
  for (const calculated of input.calculatedFields ?? []) projections.push(`${calculatedSql(calculated)} AS ${quote(calculated.name)}`);
  for (const aggregation of input.aggregations ?? []) {
    const operation = aggregation.operation;
    const column = columnFor(aggregation.field);
    if (['sum', 'avg'].includes(operation) && typeFamily(column.dataType) !== 'numeric') {
      fail('INVALID_AGGREGATION_TYPE', `ฟิลด์ ${aggregation.field.tableAlias}.${aggregation.field.column} เป็น ${column.dataType} จึงใช้ ${operation === 'sum' ? 'Sum' : 'Average'} ไม่ได้`);
    }
    const alias = aggregation.alias || `${operation}_${aggregation.field.tableAlias}_${aggregation.field.column}`;
    assertIdentifier(alias, 'INVALID_FIELD_ALIAS');
    const operationSql = operation === 'countDistinct' ? 'COUNT(DISTINCT' : operation === 'count' ? 'COUNT' : operation.toUpperCase();
    projections.push(operation === 'countDistinct'
      ? `${operationSql} ${fieldSql(aggregation.field)}) AS ${quote(alias)}`
      : `${operationSql}(${fieldSql(aggregation.field)}) AS ${quote(alias)}`);
  }
  if (!projections.length) projections.push(`${quote(base.alias)}.*`);

  const where = (input.filters ?? []).map(filter => {
    const expression = fieldSql(filter.field);
    if (filter.operator === 'is_null') return `${expression} IS NULL`;
    if (filter.operator === 'not_null') return `${expression} IS NOT NULL`;
    if (filter.operator === 'contains') {
      values.push(`%${String(filter.value ?? '')}%`);
      return `${expression}::text ILIKE $${values.length}`;
    }
    const operator = filterOperators[filter.operator];
    if (!operator) fail('INVALID_FILTER', 'Unsupported filter operator.');
    values.push(filter.value);
    return `${expression} ${operator} $${values.length}`;
  });
  const groupBy = (input.groupBy ?? []).map(fieldSql);
  const sorting = (input.sorting ?? []).map(sort => {
    const expression = 'alias' in sort.field ? quote(sort.field.alias) : fieldSql(sort.field);
    return `${expression} ${sort.direction === 'desc' ? 'DESC' : 'ASC'}`;
  });
  const pageSize = Math.max(1, Math.min(Number(input.pageSize || input.rowLimit || 100), 10_000));
  const page = Math.max(1, Number(input.page || 1));
  values.push(pageSize, (page - 1) * pageSize);

  const text = [
    `SELECT ${projections.join(', ')}`,
    `FROM ${quote(base.schema)}.${quote(base.table)} AS ${quote(base.alias)}`,
    ...joinSql,
    where.length ? `WHERE ${where.join(' AND ')}` : '',
    groupBy.length ? `GROUP BY ${groupBy.join(', ')}` : '',
    sorting.length ? `ORDER BY ${sorting.join(', ')}` : '',
    `LIMIT $${values.length - 1} OFFSET $${values.length}`,
  ].filter(Boolean).join(' ');

  return { text, values, page, pageSize };
}
