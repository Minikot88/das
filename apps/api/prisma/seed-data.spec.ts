import { describe, expect, it } from 'vitest';
import { buildSeedData } from './seed-data.js';

describe('buildSeedData', () => {
  it('contains required catalogs and has no demo-data generation path', () => {
    const seed = buildSeedData();
    expect(seed.chartTypes.map(item => item.code)).toEqual(expect.arrayContaining(['bar', 'line', 'pie', 'table', 'kpi']));
    expect(seed.dataSourceTypes.find(item => item.code === 'postgresql')).toMatchObject({ implementation: 'available' });
    expect(seed.dataSourceTypes.find(item => item.code === 'mariadb')).toMatchObject({ implementation: 'not_implemented' });
    expect(seed.dataSourceTypes.find(item => item.code === 'oracle')).toMatchObject({ implementation: 'not_implemented' });
    expect(seed).not.toHaveProperty('demoDatasets');
    expect(seed).not.toHaveProperty('organization');
    expect(seed).not.toHaveProperty('user');
  });
});
