import { describe, expect, it, vi } from 'vitest';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { CoreDataController } from './core-data.controller.js';
import { CoreDataService } from './core-data.service.js';

function service() {
  const prisma = {
    biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
    biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
    dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', status: 'ready' }) },
    datasetField: { findMany: vi.fn().mockResolvedValue([{ id: 'field-region', datasetId: 'dataset-1', fieldKey: 'region', name: 'region', dataType: 'string', nullable: false, ordinal: 0 }]) },
    datasetRow: { findMany: vi.fn().mockResolvedValue([{ rowNumber: 1, rowJson: { region: 'North' } }]) },
  };
  return new CoreDataService(prisma as never);
}

const principal = { organizationId: 'org-default', userId: 'user-development' };

describe('CoreDataService dataset query validation', () => {
  it('declares dataset queries as successful reads instead of resource creation', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CoreDataController.prototype.queryDataset)).toBe(200);
  });

  it('rejects unknown fields', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { select: ['secret_column'] })).rejects.toMatchObject({ code: 'UNKNOWN_FIELD' });
  });

  it('rejects unknown operators', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { filters: [{ field: 'region', operator: 'raw_sql', value: 'x' }] })).rejects.toMatchObject({ code: 'UNKNOWN_OPERATOR' });
  });

  it('returns paginated projected rows', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { select: ['region'], page: 1, pageSize: 10 })).resolves.toMatchObject({ rows: [{ region: 'North' }], total: 1, page: 1, pageSize: 10 });
  });
});
