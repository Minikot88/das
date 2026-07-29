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
  return new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined), assertOrganizationAdmin: vi.fn().mockResolvedValue(undefined) } as never);
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

  it('rejects a viewer attempting to create a dashboard', async () => {
    const prisma = {} as never;
    const authorization = { assertProjectPermission: vi.fn().mockRejectedValue({ status: 403, code: 'FORBIDDEN' }) };
    const service = new CoreDataService(prisma, authorization as never);
    await expect(service.createDashboard(principal, { projectId: 'project-1', name: 'Blocked' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(authorization.assertProjectPermission).toHaveBeenCalledWith(expect.anything(), 'project-1', 'write');
  });

  it('rejects a stale dataset archive before changing data', async () => {
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', revision: 3 }) },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.archiveDataset(principal, 'dataset-1', 2)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', currentRevision: 3 });
  });

  it('rejects a stale dashboard archive before changing data', async () => {
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      biDashboard: { findFirst: vi.fn().mockResolvedValue({ id: 'dashboard-1', projectId: 'project-1', organizationId: 'org-default', revision: 5 }) },
      dashboardWidget: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.archiveDashboard(principal, 'dashboard-1', 4)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', currentRevision: 5 });
  });
});
