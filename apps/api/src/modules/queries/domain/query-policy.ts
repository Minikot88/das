const WRITE_OR_CONTROL = /\b(insert|update|delete|replace|merge|create|alter|drop|truncate|grant|revoke|call|execute|prepare|begin|start\s+transaction|commit|rollback|savepoint|lock|unlock|load\s+data|outfile|dumpfile)\b/i;
const SERVER_ESCAPE = /\b(copy|vacuum|analyze|reindex|cluster|listen|notify|unlisten|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink|postgres_fdw|set\s+role|set\s+session)\b/i;

export function validateReadOnlySql(sql: string): { normalizedSql: string } {
  const normalizedSql = String(sql ?? '').trim().replace(/;+\s*$/, '').trim();
  if (!normalizedSql) throw new Error('SQL is required.');
  if (normalizedSql.includes(';')) throw new Error('Only one SQL statement is allowed.');
  if (!/^(select|with)\b/i.test(normalizedSql)) throw new Error('Only SELECT queries are allowed.');
  if (WRITE_OR_CONTROL.test(normalizedSql)) throw new Error('Write and transaction statements are forbidden.');
  if (SERVER_ESCAPE.test(normalizedSql)) throw new Error('Administrative and server file operations are forbidden.');
  if (/--|\/\*|#/.test(normalizedSql)) throw new Error('SQL comments are not allowed.');
  return { normalizedSql };
}
