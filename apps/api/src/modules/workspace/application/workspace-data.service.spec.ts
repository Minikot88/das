import { describe, expect, it, vi } from 'vitest';
import { WorkspaceDataService } from './workspace-data.service.js';

const principal = { organizationId: 'org-a', userId: 'user-a' };
const environment = { nodeEnv: 'production' } as never;
const authorization = { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never;

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    biProject: { findMany: vi.fn().mockResolvedValue([{ id: 'project-owned' }, { id: 'project-member' }]) },
    biProjectMember: { findMany: vi.fn().mockResolvedValue([{ projectId: 'project-member' }]) },
    chart: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'chart-new' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    dataset: { findFirst: vi.fn().mockResolvedValue(null) },
    biDashboard: { findFirst: vi.fn().mockResolvedValue(null) },
    dashboardWidget: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

describe('WorkspaceDataService project isolation', () => {
  it('limits chart listings to projects owned by or shared with the principal', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await service.listCharts(principal);

    expect(prisma.chart.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });

  it('rejects creating a chart with a dataset from another project', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await expect(service.createChart(principal, {
      projectId: 'project-owned',
      datasetId: 'dataset-from-another-project',
      name: 'Unsafe chart',
    })).rejects.toMatchObject({ status: 404, code: 'DATASET_NOT_FOUND' });
    expect(prisma.chart.create).not.toHaveBeenCalled();
  });

  it('scopes chart reads, updates, and deletes to accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await expect(service.getChart(principal, 'chart-private')).rejects.toMatchObject({ code: 'CHART_NOT_FOUND' });
    await expect(service.updateChart(principal, 'chart-private', { revision: 0 })).rejects.toMatchObject({ code: 'CHART_NOT_FOUND' });
    await expect(service.deleteChart(principal, 'chart-private')).rejects.toMatchObject({ code: 'CHART_NOT_FOUND' });

    for (const [options] of prisma.chart.findFirst.mock.calls) {
      expect(options.where.projectId).toEqual({ in: ['project-owned', 'project-member'] });
    }
    expect(prisma.chart.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });

  it('rejects attaching a chart from a different project', async () => {
    const prisma = createPrisma({
      biDashboard: { findFirst: vi.fn().mockResolvedValue({ id: 'dashboard-a', projectId: 'project-owned' }) },
      chart: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'chart-b', projectId: 'project-member' }),
        create: vi.fn(),
      },
    });
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await expect(service.attachChart(principal, 'dashboard-a', 'chart-b'))
      .rejects.toMatchObject({ status: 404, code: 'DASHBOARD_OR_CHART_NOT_FOUND' });
    expect(prisma.dashboardWidget.create).not.toHaveBeenCalled();
  });

  it('limits the legacy current dataset to accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await expect(service.getDataset(principal)).rejects.toMatchObject({ status: 404, code: 'DATASET_NOT_FOUND' });
    expect(prisma.dataset.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });

  it('does not return dashboard context outside accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization);

    await expect(service.dashboardContext(principal, 'dashboard-private'))
      .rejects.toMatchObject({ status: 404, code: 'DASHBOARD_NOT_FOUND' });
    expect(prisma.biDashboard.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });
});
