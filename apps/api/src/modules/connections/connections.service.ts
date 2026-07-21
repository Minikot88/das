import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { randomUUID, createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Pool, type PoolConfig } from 'pg';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { EncryptedSecretStore, type EncryptedSecret } from '../../infrastructure/secrets/encrypted-secret-store.js';
import { ApiError } from '../../shared/http/api-error.js';
import { validateReadOnlySql } from '../queries/domain/query-policy.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';

type JsonObject = Record<string, unknown>;
type ConnectionSecret = { host: string; port: number; database: string; user: string; password: string; ssl: boolean };

@Injectable()
export class ConnectionsService {
  private readonly secrets: EncryptedSecretStore;
  constructor(private readonly prisma: PrismaService, @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) { this.secrets = new EncryptedSecretStore(environment.secretMasterKey || ''); }

  private async project(principal: RequestPrincipal, projectId: string) {
    const memberIds = (await this.prisma.biProjectMember.findMany({ where: { organizationId: principal.organizationId, userId: principal.userId }, select: { projectId: true } })).map(item => item.projectId);
    const project = await this.prisma.biProject.findFirst({ where: { id: projectId, organizationId: principal.organizationId, deletedAt: null, OR: [{ ownerUserId: principal.userId }, { id: { in: memberIds } }] } });
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    return project;
  }

  private async connection(principal: RequestPrincipal, id: string) {
    const item = await this.prisma.dataSourceConnection.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null } });
    if (!item) throw new ApiError(404, 'CONNECTION_NOT_FOUND', 'Connection was not found.');
    await this.project(principal, item.projectId);
    return item;
  }

  async list(principal: RequestPrincipal, projectId: string) {
    await this.project(principal, projectId);
    return this.prisma.dataSourceConnection.findMany({ where: { organizationId: principal.organizationId, projectId, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], select: safeConnectionSelect });
  }

  async create(principal: RequestPrincipal, input: JsonObject) {
    const projectId = String(input.projectId || '');
    await this.project(principal, projectId);
    const type = String(input.type || input.provider || 'postgresql').toLowerCase();
    if (!['postgresql', 'postgres'].includes(type)) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Only PostgreSQL connections are implemented.');
    const typeRow = await this.prisma.dataSourceType.findUnique({ where: { code: 'postgresql' } });
    if (!typeRow) throw new ApiError(503, 'CONNECTION_CATALOG_NOT_READY', 'Connection catalog is not ready.', undefined, true);
    const secret = parseSecret(input);
    await validateDestination(secret.host, secret.port, this.environment.connectorNetworkAllowlist);
    const id = String(input.id || `connection-${randomUUID()}`);
    const encrypted = await this.secrets.seal(secret);
    return this.prisma.$transaction(async tx => {
      const connection = await tx.dataSourceConnection.create({ data: { id, organizationId: principal.organizationId, projectId, typeId: typeRow.id, name: String(input.name || 'PostgreSQL').slice(0, 180), metadataJson: { host: secret.host, port: secret.port, database: secret.database, user: secret.user, ssl: secret.ssl }, status: 'untested' }, select: safeConnectionSelect });
      await tx.dataSourceSecretReference.create({ data: { id: `secret-${randomUUID()}`, organizationId: principal.organizationId, connectionId: id, provider: 'encrypted_database', encryptedJson: JSON.stringify(encrypted) } });
      return connection;
    });
  }

  async testCredentials(input: JsonObject) {
    const type = String(input.type || input.provider || 'postgresql').toLowerCase();
    if (!['postgresql', 'postgres'].includes(type)) throw new ApiError(501, 'NOT_IMPLEMENTED', 'Only PostgreSQL connections are implemented.');
    const secret = parseSecret(input);
    await validateDestination(secret.host, secret.port, this.environment.connectorNetworkAllowlist);
    const started = Date.now();
    const pool = this.pool(secret);
    try { await pool.query('SELECT 1 AS ok'); return { status: 'ready', durationMs: Date.now() - started }; }
    catch { throw new ApiError(400, 'CONNECTION_FAILED', 'PostgreSQL connection failed.'); }
    finally { await pool.end(); }
  }

  async test(principal: RequestPrincipal, id: string) {
    const started = Date.now();
    const connection = await this.connection(principal, id);
    try {
      const secret = await this.openSecret(id);
      await validateDestination(secret.host, secret.port, this.environment.connectorNetworkAllowlist);
      const pool = this.pool(secret);
      try { await pool.query('SELECT 1 AS ok'); } finally { await pool.end(); }
      await this.prisma.$transaction([
        this.prisma.dataSourceConnection.update({ where: { id }, data: { status: 'ready', revision: { increment: 1 } } }),
        this.prisma.dataSourceTestRun.create({ data: { id: `connection-test-${randomUUID()}`, organizationId: principal.organizationId, connectionId: id, status: 'ready', durationMs: Date.now() - started } }),
      ]);
      return { id: connection.id, status: 'ready', durationMs: Date.now() - started };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.dataSourceConnection.update({ where: { id }, data: { status: 'failed', revision: { increment: 1 } } }),
        this.prisma.dataSourceTestRun.create({ data: { id: `connection-test-${randomUUID()}`, organizationId: principal.organizationId, connectionId: id, status: 'failed', durationMs: Date.now() - started, errorCode: 'CONNECTION_FAILED', safeMessage: 'PostgreSQL connection failed.' } }),
      ]);
      throw new ApiError(400, 'CONNECTION_FAILED', 'PostgreSQL connection failed.');
    }
  }

  async discover(principal: RequestPrincipal, id: string) {
    await this.connection(principal, id);
    const secret = await this.openSecret(id);
    await validateDestination(secret.host, secret.port, this.environment.connectorNetworkAllowlist);
    const pool = this.pool(secret);
    try {
      const result = await pool.query<{ table_schema: string; table_name: string; table_type: string; column_name: string; data_type: string; is_nullable: string; ordinal_position: number }>(`
        SELECT t.table_schema, t.table_name, t.table_type, c.column_name, c.data_type, c.is_nullable, c.ordinal_position
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY t.table_schema, t.table_name, c.ordinal_position
        LIMIT 10000
      `);
      const schemas = new Map<string, { name: string; tables: Map<string, { name: string; type: string; columns: unknown[] }> }>();
      for (const row of result.rows) {
        const schema = schemas.get(row.table_schema) || { name: row.table_schema, tables: new Map() };
        const table = schema.tables.get(row.table_name) || { name: row.table_name, type: row.table_type, columns: [] };
        table.columns.push({ name: row.column_name, dataType: row.data_type, nullable: row.is_nullable === 'YES', ordinal: row.ordinal_position });
        schema.tables.set(row.table_name, table); schemas.set(row.table_schema, schema);
      }
      return [...schemas.values()].map(schema => ({ name: schema.name, tables: [...schema.tables.values()] }));
    } finally { await pool.end(); }
  }

  async execute(principal: RequestPrincipal, id: string, sql: string, parameters: unknown[], requestId: string) {
    const connection = await this.connection(principal, id);
    let normalizedSql: string;
    try { normalizedSql = validateReadOnlySql(sql).normalizedSql; } catch (error) { throw new ApiError(400, 'UNSAFE_QUERY', error instanceof Error ? error.message : 'Query is not allowed.'); }
    const secret = await this.openSecret(id);
    await validateDestination(secret.host, secret.port, this.environment.connectorNetworkAllowlist);
    const limit = Math.min(this.environment.queryRowLimit, 5000);
    const wrapped = `SELECT * FROM (${normalizedSql}) AS mini_bi_readonly_query LIMIT $${parameters.length + 1}`;
    const runId = `query-run-${randomUUID()}`;
    const started = Date.now();
    const pool = this.pool(secret);
    try {
      const result = await pool.query({ text: wrapped, values: [...parameters, limit + 1], rowMode: 'array' });
      const truncated = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      await this.prisma.$transaction([
        this.prisma.sqlQueryRun.create({ data: { id: runId, organizationId: principal.organizationId, projectId: connection.projectId, connectionId: id, sqlHash: createHash('sha256').update(normalizedSql).digest('hex'), status: 'succeeded', durationMs: Date.now() - started, rowCount: rows.length, truncated } }),
        this.prisma.auditLog.create({ data: { organizationId: principal.organizationId, projectId: connection.projectId, actorUserId: principal.userId, requestId, entityType: 'connection', entityId: id, action: 'connection.query.execute', outcome: 'succeeded', metadataJson: { rowCount: rows.length, truncated } } }),
      ]);
      return { columns: result.fields.map(field => ({ name: field.name, dataTypeId: field.dataTypeID })), rows, rowCount: rows.length, truncated, durationMs: Date.now() - started };
    } catch (error) {
      await this.prisma.sqlQueryRun.create({ data: { id: runId, organizationId: principal.organizationId, projectId: connection.projectId, connectionId: id, sqlHash: createHash('sha256').update(normalizedSql).digest('hex'), status: 'failed', durationMs: Date.now() - started, rowCount: 0 } });
      throw new ApiError(400, 'QUERY_FAILED', 'PostgreSQL query failed.');
    } finally { await pool.end(); }
  }

  async remove(principal: RequestPrincipal, id: string, revision: number) {
    const connection = await this.connection(principal, id);
    if (!Number.isInteger(revision) || revision !== connection.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Connection has changed since it was loaded.', undefined, false, connection.revision);
    await this.prisma.dataSourceConnection.update({ where: { id }, data: { deletedAt: new Date(), status: 'deleted', revision: { increment: 1 } } });
    return { success: true };
  }

  private async openSecret(connectionId: string): Promise<ConnectionSecret> {
    const row = await this.prisma.dataSourceSecretReference.findUnique({ where: { connectionId } });
    if (!row) throw new ApiError(503, 'SECRET_NOT_AVAILABLE', 'Connection secret is not available.', undefined, true);
    const opened = await this.secrets.open(JSON.parse(row.encryptedJson) as EncryptedSecret);
    return parseSecret(opened);
  }

  private pool(secret: ConnectionSecret) {
    const config: PoolConfig = { host: secret.host, port: secret.port, database: secret.database, user: secret.user, password: secret.password, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 5000, statement_timeout: this.environment.queryTimeoutMs, query_timeout: this.environment.queryTimeoutMs, application_name: 'dashboard-mini-bi-readonly', ssl: secret.ssl ? { rejectUnauthorized: true } : false };
    return new Pool(config);
  }
}

const safeConnectionSelect = { id: true, organizationId: true, projectId: true, typeId: true, name: true, metadataJson: true, status: true, revision: true, createdAt: true, updatedAt: true } as const;
function parseSecret(input: JsonObject): ConnectionSecret { const host = String(input.host || '').trim().toLowerCase(); const port = Number(input.port || 5432); const database = String(input.database || '').trim(); const user = String(input.user || input.username || '').trim(); const password = String(input.password || ''); const ssl = input.ssl === true || input.ssl === 'true' || input.sslMode === 'require'; if (!host || !database || !user || !password) throw new ApiError(400, 'VALIDATION_ERROR', 'host, database, user and password are required.'); if (!Number.isInteger(port) || port !== 5432) throw new ApiError(400, 'PORT_NOT_ALLOWED', 'Only PostgreSQL port 5432 is allowed.'); return { host, port, database, user, password, ssl }; }
export async function validateDestination(host: string, port: number, allowlist: string[]) { if (port !== 5432) throw new ApiError(400, 'PORT_NOT_ALLOWED', 'Only PostgreSQL port 5432 is allowed.'); const normalizedAllowlist = new Set(allowlist.map(item => item.toLowerCase())); let addresses: Array<{ address: string }>; try { addresses = await lookup(host, { all: true, verbatim: true }); } catch { throw new ApiError(400, 'HOST_RESOLUTION_FAILED', 'Connection host could not be resolved.'); } if (!addresses.length) throw new ApiError(400, 'HOST_RESOLUTION_FAILED', 'Connection host could not be resolved.'); for (const { address } of addresses) { if (isBlockedAddress(address) && !normalizedAllowlist.has(host) && !normalizedAllowlist.has(address.toLowerCase())) throw new ApiError(400, 'SSRF_DESTINATION_BLOCKED', 'Connection destination is blocked.'); } }
export function isBlockedAddress(address: string) { if (isIP(address) === 6) { const value = address.toLowerCase(); return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('ff'); } const octets = address.split('.').map(Number); const [a,b,c] = octets; return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0 && c === 0) || a >= 224; }
