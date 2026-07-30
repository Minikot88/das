import type { DataField, DatasetJoin, DatasetTable, SemanticType } from "../types";

type ExternalColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKeys?: DataField["foreignKeys"];
};

type ExternalRelation = {
  columnName: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
};

export function createTableAlias(tableName: string, aliases: string[]) {
  const root = tableName.replace(/^sc_/, "").replace(/[^A-Za-z0-9_]/g, "_") || "table";
  let alias = root;
  let suffix = 2;
  while (aliases.includes(alias)) alias = `${root}_${suffix++}`;
  return alias;
}

export function relationToJoin(left: DatasetTable, right: DatasetTable, relation: ExternalRelation): DatasetJoin | null {
  if (relation.referencedSchema !== right.schema || relation.referencedTable !== right.table) return null;
  return {
    left: { ...left, column: relation.columnName },
    right: { ...right, column: relation.referencedColumn },
    operator: "eq",
    joinType: "left",
    automatic: true,
  };
}

function fieldType(physicalType: string): DataField["type"] {
  if (/int|numeric|decimal|double|real|money/i.test(physicalType)) return "number";
  if (/date|time/i.test(physicalType)) return "date";
  if (/bool/i.test(physicalType)) return "boolean";
  return "text";
}

function semanticType(type: DataField["type"], primaryKey: boolean): SemanticType {
  if (primaryKey) return "category";
  if (type === "date") return "date";
  if (type === "number") return "quantity";
  if (type === "boolean") return "boolean";
  return "category";
}

export function toQualifiedFields(table: DatasetTable, columns: ExternalColumn[]): DataField[] {
  return columns.map((column) => {
    const type = fieldType(column.dataType);
    const identifier = column.primaryKey || /(^id$|_id$|^id_)/i.test(column.name);
    return {
      id: `${table.alias}_${column.name}`,
      name: `${table.alias}.${column.name}`,
      label: `${table.alias}.${column.name}`,
      type,
      semanticType: semanticType(type, identifier),
      table: `${table.schema}.${table.table}`,
      description: `${column.dataType}${column.nullable ? " · nullable" : " · required"}`,
      sampleValues: [],
      isMeasure: type === "number" && !identifier,
      isDimension: type !== "number" || identifier,
      defaultAggregation: identifier ? "Count" : type === "number" ? "Sum" : "None",
      isPrimaryKey: column.primaryKey,
      physicalType: column.dataType,
      sourceSchema: table.schema,
      sourceTable: table.table,
      sourceAlias: table.alias,
      nullable: column.nullable,
      foreignKeys: column.foreignKeys ?? [],
    };
  });
}
