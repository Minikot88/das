import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { ProjectRecord, ProjectRepository } from '../application/project.repository.js';

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}
  list(organizationId: string) { return this.prisma.biProject.findMany({ where: { organizationId, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] }); }
  find(organizationId: string, id: string) { return this.prisma.biProject.findFirst({ where: { organizationId, id, deletedAt: null } }); }
  create(record: ProjectRecord) { return this.prisma.biProject.create({ data: record }); }
  async update(organizationId: string, id: string, expectedRevision: number, name: string) {
    const result = await this.prisma.biProject.updateMany({ where: { organizationId, id, revision: expectedRevision, deletedAt: null }, data: { name, revision: { increment: 1 } } });
    return result.count === 1 ? this.find(organizationId, id) : null;
  }
  async softDelete(organizationId: string, id: string, expectedRevision: number) {
    const result = await this.prisma.biProject.updateMany({ where: { organizationId, id, revision: expectedRevision, deletedAt: null }, data: { deletedAt: new Date(), revision: { increment: 1 } } });
    return result.count === 1;
  }
}
