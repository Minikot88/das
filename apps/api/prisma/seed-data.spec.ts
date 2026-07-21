import { describe, expect, it } from 'vitest';
import { buildSeedData } from './seed-data.js';

describe('buildSeedData', () => {
  it('contains required catalogs and excludes demo datasets by default', () => {
    const seed = buildSeedData({ includeDemoSales: false });
    expect(seed.organization.id).toBe('org-default');
    expect(seed.chartTypes.map(item => item.code)).toEqual(expect.arrayContaining(['bar', 'line', 'pie', 'table', 'kpi']));
    expect(seed.dataSourceTypes.find(item => item.code === 'mariadb')).toMatchObject({ implementation: 'available' });
    expect(seed.dataSourceTypes.find(item => item.code === 'oracle')).toMatchObject({ implementation: 'not_implemented' });
    expect(seed.demoDatasets).toEqual([]);
  });
});
