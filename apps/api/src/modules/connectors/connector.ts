export type ConnectorCapabilities = {
  connectorType: string;
  implemented: boolean;
  readOnly: boolean;
  joins: Array<'inner' | 'left'>;
  supports: {
    testConnection: boolean;
    listSchemas: boolean;
    listObjects: boolean;
    listColumns: boolean;
    listRelationships: boolean;
    preview: boolean;
    executeStructuredQuery: boolean;
    estimateRowCount: boolean;
  };
};

export interface DataSourceConnector {
  readonly connectorType: string;
  getCapabilities(): ConnectorCapabilities;
  testConnection(): Promise<{ status: 'ready'; durationMs: number }>;
  listSchemas(): Promise<unknown>;
  listObjects(schemaName: string): Promise<unknown>;
  listColumns(schemaName: string, objectName: string): Promise<unknown>;
  listRelationships(schemaName: string, objectName: string): Promise<unknown>;
  preview(input: Record<string, unknown>): Promise<unknown>;
  executeStructuredQuery(input: Record<string, unknown>): Promise<unknown>;
  estimateRowCount(schemaName: string, objectName: string): Promise<number>;
}
