export function buildSeedData() {
  return {
    chartTypes: ['bar','line','pie','table','kpi','area','scatter','radar','funnel','gauge'].map(code => ({ id: `chart-type-${code}`, code, name: code[0].toUpperCase() + code.slice(1), renderer: code === 'table' || code === 'kpi' ? 'native' : 'echarts' })),
    dataSourceTypes: [
      { id: 'source-type-postgresql', code: 'postgresql', name: 'PostgreSQL', implementation: 'available' },
      { id: 'source-type-mysql', code: 'mysql', name: 'MySQL', implementation: 'not_implemented' },
      { id: 'source-type-mariadb', code: 'mariadb', name: 'MariaDB', implementation: 'not_implemented' },
      { id: 'source-type-sqlserver', code: 'sqlserver', name: 'SQL Server', implementation: 'not_implemented' },
      { id: 'source-type-oracle', code: 'oracle', name: 'Oracle', implementation: 'not_implemented' },
      { id: 'source-type-sqlite', code: 'sqlite', name: 'SQLite', implementation: 'not_implemented' },
      { id: 'source-type-mongodb', code: 'mongodb', name: 'MongoDB', implementation: 'not_implemented' },
      { id: 'source-type-csv', code: 'csv', name: 'CSV', implementation: 'available' },
    ],
  };
}
