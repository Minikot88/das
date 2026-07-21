import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../shared/http/api-error.js';
import { ProjectService } from './project.service.js';
import type { ProjectRecord, ProjectRepository } from './project.repository.js';

class MemoryProjectRepository implements ProjectRepository {
  records: ProjectRecord[] = [];
  list(organizationId: string, userId: string) { return Promise.resolve(this.records.filter(item => item.organizationId === organizationId && item.ownerUserId === userId)); }
  find(organizationId: string, userId: string, id: string) { return Promise.resolve(this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id) ?? null); }
  create(record: ProjectRecord) { this.records.push(record); return Promise.resolve(record); }
  update(organizationId: string, userId: string, id: string, expectedRevision: number, name: string) {
    const record = this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id && item.revision === expectedRevision);
    if (!record) return Promise.resolve(null);
    record.name = name; record.revision += 1; record.updatedAt = new Date();
    return Promise.resolve(record);
  }
  softDelete(organizationId: string, userId: string, id: string, expectedRevision: number) {
    const record = this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id && item.revision === expectedRevision);
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

  it('does not expose or mutate projects owned by another user in the same organization', async () => {
    const repository = new MemoryProjectRepository();
    const service = new ProjectService(repository);
    const owner = { organizationId: 'org-a', userId: 'owner-a' };
    const other = { organizationId: 'org-a', userId: 'user-b' };
    const created = await service.create(owner, 'Private finance');

    expect(await service.list(other)).toEqual([]);
    await expect(service.get(other, created.id)).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
    await expect(service.update(other, created.id, { name: 'Hijacked', revision: 0 }))
      .rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
    await expect(service.remove(other, created.id, 0)).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
  });
});
