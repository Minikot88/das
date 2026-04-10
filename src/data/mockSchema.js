import { TYPE_BADGE, TYPE_COLOR, schema as dataSchema } from "./mockData";

export { TYPE_BADGE, TYPE_COLOR };

function toLabel(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTableSchema(tableName, table) {
  return {
    label: toLabel(tableName),
    dataKey: tableName,
    fields: table.fields,
  };
}

export const schema = Object.fromEntries(
  Object.entries(dataSchema).map(([dbName, tables]) => [
    dbName,
    {
      label: toLabel(dbName),
      tables: Object.fromEntries(
        Object.entries(tables).map(([tableName, table]) => [
          tableName,
          buildTableSchema(tableName, table),
        ])
      ),
    },
  ])
);

export function findTable(dbName, tableName) {
  return schema[dbName]?.tables?.[tableName] ?? null;
}
