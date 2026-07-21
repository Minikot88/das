import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const databaseDir = path.join(root, 'docs', 'database');
const [tables, columns, relationships, indexes, constraints] = await Promise.all([
  readCsv(path.join(databaseDir, 'tables.csv')),
  readCsv(path.join(databaseDir, 'columns.csv')),
  readCsv(path.join(databaseDir, 'relationships.csv')),
  readCsv(path.join(databaseDir, 'indexes.csv')),
  readCsv(path.join(databaseDir, 'constraints.csv')),
]);

const failures = [];
const tableNames = new Set(tables.map(row => row.TableName));
const columnKeys = new Set(columns.map(row => `${row.table_name}.${row.column_name}`));
const implementedScopes = new Set(['P0_CORE', 'P1_PRODUCTION_EXTENSION']);

if (tableNames.size !== tables.length) failures.push('Duplicate table names in tables.csv');
const duplicateColumns = columns.length - columnKeys.size;
if (duplicateColumns) failures.push(`${duplicateColumns} duplicate table/column rows in columns.csv`);

for (const table of tables.filter(row => implementedScopes.has(row.classification))) {
  const tableColumns = columns.filter(column => column.table_name === table.TableName);
  if (!tableColumns.length) failures.push(`${table.TableName} has no columns`);
  if (!tableColumns.some(column => column.primary_key === 'YES')) failures.push(`${table.TableName} has no primary key`);
}

for (const relationship of relationships) {
  const from = `${relationship.FromTable}.${relationship.FromColumn}`;
  const to = `${relationship.ToTable}.${relationship.ToColumn}`;
  if (!columnKeys.has(from)) failures.push(`Missing relationship source ${from}`);
  if (!columnKeys.has(to)) failures.push(`Missing relationship target ${to}`);
}

const duplicateIndexNames = new Set();
const indexNames = new Set();
for (const index of indexes) {
  const key = `${index.TableName}.${index.IndexName}`;
  if (indexNames.has(key)) duplicateIndexNames.add(key);
  indexNames.add(key);
}
if (duplicateIndexNames.size) failures.push(`Duplicate indexes: ${[...duplicateIndexNames].join(', ')}`);

const duplicateConstraintNames = new Set();
const constraintNames = new Set();
for (const constraint of constraints) {
  const key = `${constraint.TableName}.${constraint.ConstraintName}`;
  if (constraintNames.has(key)) duplicateConstraintNames.add(key);
  constraintNames.add(key);
}
if (duplicateConstraintNames.size) failures.push(`Duplicate constraints: ${[...duplicateConstraintNames].join(', ')}`);

if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  tables: tables.length,
  p0Tables: tables.filter(row => row.classification === 'P0_CORE').length,
  p1Tables: tables.filter(row => row.classification === 'P1_PRODUCTION_EXTENSION').length,
  columns: columns.length,
  physicalRelationships: relationships.length,
  approvedIndexes: indexes.length,
  approvedConstraints: constraints.length,
}, null, 2));
