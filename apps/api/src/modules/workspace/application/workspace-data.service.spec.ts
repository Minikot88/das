import { describe, expect, it, vi } from 'vitest';
import { WorkspaceDataService } from './workspace-data.service.js';

const principal = { organizationId: 'org-a', userId: 'user-a' };
const environment = { nodeEnv: 'production' } as never;
const authorization = { assertProjectPermission: vi.fn().mockResolvedValue(undefined) };

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    biProject: { findMany: vi.fn().mockResolvedValue([{ id: 'project-owned' }, { id: 'project-member' }]) },
    biProjectMember: { findMany: vi.fn().mockResolvedValue([{ projectId: 'project-member' }]) },
    chartType: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    chartTemplate: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    chart: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'chart-new' }),
      update: vi.fn(),
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
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await service.listCharts(principal);

    expect(prisma.chart.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });

  it('limits chart listings to the requested accessible project', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await service.listCharts(principal, 'project-member');

    expect(authorization.assertProjectPermission).toHaveBeenCalledWith(principal, 'project-member', 'read');
    expect(prisma.chart.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-member'] } }),
    }));
  });

  it('rejects creating a chart with a dataset from another project', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await expect(service.createChart(principal, {
      projectId: 'project-owned',
      datasetId: 'dataset-from-another-project',
      name: 'Unsafe chart',
    })).rejects.toMatchObject({ status: 404, code: 'DATASET_NOT_FOUND' });
    expect(prisma.chart.create).not.toHaveBeenCalled();
  });

  it('persists API preview rows as a PostgreSQL-backed chart snapshot', async () => {
    const prisma = createPrisma({
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-a' }) },
      chartType: { findFirst: vi.fn().mockResolvedValue({ id: 'chart-type-bar' }), findMany: vi.fn().mockResolvedValue([]) },
      chart: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(async ({ data }) => data),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    });
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    const chart = await service.createChart(principal, {
      projectId: 'project-owned',
      datasetId: 'dataset-a',
      templateId: 'bar',
      rows: [{ month: 'Jan', sales: 10 }],
      schema: { fields: [{ name: 'month', type: 'string' }, { name: 'sales', type: 'number' }] },
      config: { type: 'bar' },
    });

    expect(prisma.chart.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        chartTypeId: 'chart-type-bar',
        dataContractJson: expect.objectContaining({
          sourceType: 'snapshot',
          rows: [{ month: 'Jan', sales: 10 }],
        }),
      }),
    }));
    expect(chart).toMatchObject({
      title: 'Untitled chart',
      chartType: 'bar',
      templateId: 'bar',
      dataContract: { sourceType: 'snapshot', rows: [{ month: 'Jan', sales: 10 }] },
    });
  });

  it('scopes chart reads, updates, and deletes to accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

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
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await expect(service.attachChart(principal, 'dashboard-a', 'chart-b'))
      .rejects.toMatchObject({ status: 404, code: 'DASHBOARD_OR_CHART_NOT_FOUND' });
    expect(prisma.dashboardWidget.create).not.toHaveBeenCalled();
  });

  it('limits the legacy current dataset to accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await expect(service.getDataset(principal)).rejects.toMatchObject({ status: 404, code: 'DATASET_NOT_FOUND' });
    expect(prisma.dataset.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });

  it('does not return dashboard context outside accessible projects', async () => {
    const prisma = createPrisma();
    const service = new WorkspaceDataService(prisma as never, environment, authorization as never);

    await expect(service.dashboardContext(principal, 'dashboard-private'))
      .rejects.toMatchObject({ status: 404, code: 'DASHBOARD_NOT_FOUND' });
    expect(prisma.biDashboard.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ['project-owned', 'project-member'] } }),
    }));
  });
});
