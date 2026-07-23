import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const databaseDir = path.join(root, 'docs', 'database');
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(databaseDir, 'schema-manifest.generated.json');
const [tables, columns, relationships, indexes, constraints, enums] = await Promise.all([
  readCsv(path.join(databaseDir, 'tables.csv')),
  readCsv(path.join(databaseDir, 'columns.csv')),
  readCsv(path.join(databaseDir, 'relationships.csv')),
  readCsv(path.join(databaseDir, 'indexes.csv')),
  readCsv(path.join(databaseDir, 'constraints.csv')),
  readCsv(path.join(databaseDir, 'enums.csv')),
]);

const manifest = {
  manifestVersion: 1,
  engine: 'MariaDB',
  engineVersion: '11.4',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  orm: 'Prisma',
  generatedAt: new Date().toISOString(),
  tables: tables.map(row => ({ name: row.TableName, module: row.ModuleID, classification: row.classification, approvalStatus: row.approvalStatus, migration: row.migrationName || null })),
  columns: columns.map(row => ({ table: row.table_name, name: row.column_name, type: row.data_type, nullable: row.nullable, primaryKey: row.primary_key, classification: row.classification })),
  relationships,
  indexes,
  constraints,
  enums,
  implementationPhases: ['P0_CORE', 'P1_PRODUCTION_EXTENSION', 'P2_ENTERPRISE_FUTURE', 'SEED_OR_SAMPLE', 'REJECTED_OR_MERGED'],
};

await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${outputPath}`);
