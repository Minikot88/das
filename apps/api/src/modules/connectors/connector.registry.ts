import type { DataSourceConnector } from './connector.js';

export class ConnectorRegistry {
  private readonly connectors: Map<string, DataSourceConnector>;

  constructor(connectors: DataSourceConnector[]) {
    this.connectors = new Map(connectors.map(connector => [connector.connectorType, connector]));
  }

  get(connectorType: string) {
    const connector = this.connectors.get(String(connectorType || '').toLowerCase());
    if (!connector) throw new Error(`Connector ${connectorType} is not implemented.`);
    return connector;
  }
}
