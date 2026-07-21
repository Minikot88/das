import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../shared/http/api-error.js';
import { ProjectService } from './project.service.js';
import type { ProjectRecord, ProjectRepository } from './project.repository.js';

class MemoryProjectRepository implements ProjectRepository {
  records: ProjectRecord[] = [];
  list(organizationId: string) { return Promise.resolve(this.records.filter(item => item.organizationId === organizationId)); }
  find(organizationId: string, id: string) { return Promise.resolve(this.records.find(item => item.organizationId === organizationId && item.id === id) ?? null); }
  create(record: ProjectRecord) { this.records.push(record); return Promise.resolve(record); }
  update(organizationId: string, id: string, expectedRevision: number, name: string) {
    const record = this.records.find(item => item.organizationId === organizationId && item.id === id && item.revision === expectedRevision);
    if (!record) return Promise.resolve(null);
    record.name = name; record.revision += 1; record.updatedAt = new Date();
    return Promise.resolve(record);
  }
  softDelete(organizationId: string, id: string, expectedRevision: number) {
    const record = this.records.find(item => item.organizationId === organizationId && item.id === id && item.revision === expectedRevision);
    if (!record) return Promise.resolve(false);
    record.deletedAt = new Date(); record.revision += 1;
    return Promise.resolve(true);
  }
}

describe('ProjectService', () => {
  it('isolates organizations and rejects stale writes', async () => {
    const repository = new MemoryProjectRepository();
    const service = new ProjectService(repository);
    const created = await service.create({ organizationId: 'org-a', userId: 'user-a' }, 'Finance');
    expect(await service.list({ organizationId: 'org-b', userId: 'user-b' })).toEqual([]);
    await service.update({ organizationId: 'org-a', userId: 'user-a' }, created.id, { name: 'Finance 2026', revision: 0 });
    await expect(service.update({ organizationId: 'org-a', userId: 'user-a' }, created.id, { name: 'stale', revision: 0 }))
      .rejects.toMatchObject({ status: 409, code: 'REVISION_CONFLICT' } satisfies Partial<ApiError>);
  });
});
