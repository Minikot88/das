import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { ProjectRecord, ProjectRepository } from '../application/project.repository.js';

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  private async accessibleProjectIds(organizationId: string, userId: string) {
    const memberships = await this.prisma.biProjectMember.findMany({ where: { organizationId, userId }, select: { projectId: true } });
    const projects = await this.prisma.biProject.findMany({
      where: { organizationId, deletedAt: null, OR: [{ ownerUserId: userId }, { id: { in: memberships.map(item => item.projectId) } }] },
      select: { id: true },
    });
    return projects.map(item => item.id);
  }
  async list(organizationId: string, userId: string) {
    const ids = await this.accessibleProjectIds(organizationId, userId);
    return this.prisma.biProject.findMany({ where: { organizationId, id: { in: ids }, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
  }
  async find(organizationId: string, userId: string, id: string) {
    const ids = await this.accessibleProjectIds(organizationId, userId);
    if (!ids.includes(id)) return null;
    return this.prisma.biProject.findFirst({ where: { organizationId, id, deletedAt: null } });
  }
  create(record: ProjectRecord) { return this.prisma.biProject.create({ data: record }); }
  async update(organizationId: string, userId: string, id: string, expectedRevision: number, name: string) {
    const ids = await this.accessibleProjectIds(organizationId, userId);
    if (!ids.includes(id)) return null;
    const result = await this.prisma.biProject.updateMany({ where: { organizationId, id, revision: expectedRevision, deletedAt: null }, data: { name, revision: { increment: 1 } } });
    return result.count === 1 ? this.find(organizationId, userId, id) : null;
  }
  async softDelete(organizationId: string, userId: string, id: string, expectedRevision: number) {
    const ids = await this.accessibleProjectIds(organizationId, userId);
    if (!ids.includes(id)) return false;
    const result = await this.prisma.biProject.updateMany({ where: { organizationId, id, revision: expectedRevision, deletedAt: null }, data: { deletedAt: new Date(), revision: { increment: 1 } } });
    return result.count === 1;
  }
}
