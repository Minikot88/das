import { Injectable } from '@nestjs/common';
import type { ProjectRecord, ProjectRepository } from '../application/project.repository.js';

@Injectable()
export class MemoryProjectRepository implements ProjectRepository {
  private readonly records: ProjectRecord[] = [];
  list(organizationId: string, userId: string) { return Promise.resolve(this.records.filter(item => item.organizationId === organizationId && item.ownerUserId === userId && !item.deletedAt)); }
  find(organizationId: string, userId: string, id: string) { return Promise.resolve(this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id && !item.deletedAt) ?? null); }
  create(record: ProjectRecord) { this.records.push(record); return Promise.resolve(record); }
  update(organizationId: string, userId: string, id: string, expectedRevision: number, name: string) {
    const record = this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id && item.revision === expectedRevision && !item.deletedAt);
    if (!record) return Promise.resolve(null);
    record.name = name; record.revision += 1; record.updatedAt = new Date(); return Promise.resolve(record);
  }
  softDelete(organizationId: string, userId: string, id: string, expectedRevision: number) {
    const record = this.records.find(item => item.organizationId === organizationId && item.ownerUserId === userId && item.id === id && item.revision === expectedRevision && !item.deletedAt);
    if (!record) return Promise.resolve(false);
    record.deletedAt = new Date(); record.revision += 1; return Promise.resolve(true);
  }
}
