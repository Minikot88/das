export type ForeignKeyEdge = {
  name: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
};

export type RelationshipHop = {
  name: string;
  columnName: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
  direction: "outgoing" | "incoming";
};

type PathState = { table: string; visited: Set<string>; hops: RelationshipHop[] };

export function findShortestRelationshipPaths(
  edges: ForeignKeyEdge[],
  schemaName: string,
  sourceTable: string,
  targetTable: string,
  maxTables = 6,
) {
  if (sourceTable === targetTable) return [];
  const schema = schemaName.toLowerCase();
  const usable = edges.filter((edge) => edge.sourceSchema === schema && edge.targetSchema === schema);
  const queue: PathState[] = [{ table: sourceTable, visited: new Set([sourceTable]), hops: [] }];
  const paths: RelationshipHop[][] = [];
  let shortestLength: number | null = null;

  while (queue.length) {
    const current = queue.shift()!;
    if (shortestLength !== null && current.hops.length >= shortestLength) continue;
    if (current.hops.length >= maxTables - 1) continue;

    for (const edge of usable) {
      const outgoing = edge.sourceTable === current.table;
      const incoming = edge.targetTable === current.table;
      if (!outgoing && !incoming) continue;
      const nextTable = outgoing ? edge.targetTable : edge.sourceTable;
      if (current.visited.has(nextTable)) continue;
      const hop: RelationshipHop = outgoing
        ? { name: edge.name, columnName: edge.sourceColumn, referencedSchema: edge.targetSchema, referencedTable: edge.targetTable, referencedColumn: edge.targetColumn, direction: "outgoing" }
        : { name: edge.name, columnName: edge.targetColumn, referencedSchema: edge.sourceSchema, referencedTable: edge.sourceTable, referencedColumn: edge.sourceColumn, direction: "incoming" };
      const hops = [...current.hops, hop];
      if (nextTable === targetTable) {
        shortestLength = hops.length;
        paths.push(hops);
        continue;
      }
      queue.push({ table: nextTable, visited: new Set([...current.visited, nextTable]), hops });
    }
  }

  return paths.filter((path) => path.length === shortestLength);
}
