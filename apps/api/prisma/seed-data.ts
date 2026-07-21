type SeedOptions = { includeDemoSales: boolean };

export function buildSeedData(options: SeedOptions) {
  return {
    organization: { id: 'org-default', code: 'DEFAULT', name: 'Default Organization' },
    user: {
      id: 'user-development', organizationId: 'org-default', externalUserId: 'development-user',
      externalAuthProvider: 'development', email: 'dev@example.com', displayName: 'Development User',
    },
    roles: [
      { id: 'role-owner', organizationId: 'org-default', code: 'owner', name: 'Owner', isSystem: true },
      { id: 'role-editor', organizationId: 'org-default', code: 'editor', name: 'Editor', isSystem: true },
      { id: 'role-viewer', organizationId: 'org-default', code: 'viewer', name: 'Viewer', isSystem: true },
    ],
    permissions: ['project.read','project.write','project.delete','dataset.read','dataset.write','chart.read','chart.write','dashboard.read','dashboard.write','connection.read','connection.write','share.write'].map(code => ({ id: `permission-${code.replaceAll('.','-')}`, code })),
    chartTypes: ['bar','line','pie','table','kpi','area','scatter','radar','funnel','gauge'].map(code => ({ id: `chart-type-${code}`, code, name: code[0].toUpperCase() + code.slice(1), renderer: code === 'table' || code === 'kpi' ? 'native' : 'echarts' })),
    dataSourceTypes: [
      { id: 'source-type-mariadb', code: 'mariadb', name: 'MariaDB / MySQL', implementation: 'not_implemented' },
      { id: 'source-type-postgresql', code: 'postgresql', name: 'PostgreSQL', implementation: 'available' },
      { id: 'source-type-sqlserver', code: 'sqlserver', name: 'SQL Server', implementation: 'not_implemented' },
      { id: 'source-type-oracle', code: 'oracle', name: 'Oracle', implementation: 'not_implemented' },
      { id: 'source-type-csv', code: 'csv', name: 'CSV', implementation: 'available' },
    ],
    demoDatasets: options.includeDemoSales ? [{ id: 'demo-sales', name: 'Demo Sales' }] : [],
  };
}
