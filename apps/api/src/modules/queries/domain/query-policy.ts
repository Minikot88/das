const WRITE_OR_CONTROL = /\b(insert|update|delete|replace|merge|create|alter|drop|truncate|grant|revoke|call|execute|prepare|begin|start\s+transaction|commit|rollback|savepoint|lock|unlock|load\s+data|outfile|dumpfile)\b/i;

export function validateReadOnlySql(sql: string): { normalizedSql: string } {
  const normalizedSql = String(sql ?? '').trim().replace(/;+\s*$/, '').trim();
  if (!normalizedSql) throw new Error('SQL is required.');
  if (normalizedSql.includes(';')) throw new Error('Only one SQL statement is allowed.');
  if (!/^(select|with)\b/i.test(normalizedSql)) throw new Error('Only SELECT queries are allowed.');
  if (WRITE_OR_CONTROL.test(normalizedSql)) throw new Error('Write and transaction statements are forbidden.');
  if (/--|\/\*|#/.test(normalizedSql)) throw new Error('SQL comments are not allowed.');
  return { normalizedSql };
}
