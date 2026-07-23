import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ApiError } from '../../../shared/http/api-error.js';
import { PROJECT_REPOSITORY, type ProjectRepository } from './project.repository.js';
import { AuthorizationService } from '../../auth/application/authorization.service.js';

export type RequestPrincipal = { organizationId: string; userId: string; sessionId?: string; roles?: string[]; csrfTokenHash?: string };

@Injectable()
export class ProjectService {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository, private readonly authorization: AuthorizationService) {}

  list(principal: RequestPrincipal) { return this.repository.list(principal.organizationId, principal.userId); }

  async get(principal: RequestPrincipal, id: string) {
    const project = await this.repository.find(principal.organizationId, principal.userId, id);
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    return project;
  }

  async create(principal: RequestPrincipal, name: string) {
    await this.authorization.assertOrganizationAdmin(principal as never, principal.organizationId);
    const normalized = name.trim();
    if (!normalized) throw new ApiError(400, 'VALIDATION_ERROR', 'Project name is required.', { name: 'Required' });
    const now = new Date();
    return this.repository.create({ id: `project-${randomUUID()}`, organizationId: principal.organizationId, ownerUserId: principal.userId, name: normalized, status: 'active', revision: 0, createdAt: now, updatedAt: now, deletedAt: null });
  }

  async update(principal: RequestPrincipal, id: string, input: { name: string; revision: number }) {
    await this.authorization.assertProjectPermission(principal as never, id, 'manage_members');
    const updated = await this.repository.update(principal.organizationId, principal.userId, id, input.revision, input.name.trim());
    if (updated) return updated;
    const current = await this.repository.find(principal.organizationId, principal.userId, id);
    if (!current) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    throw new ApiError(409, 'REVISION_CONFLICT', 'Project has changed since it was loaded.', undefined, false, current.revision);
  }

  async remove(principal: RequestPrincipal, id: string, revision: number) {
    await this.authorization.assertProjectPermission(principal as never, id, 'manage_members');
    if (await this.repository.softDelete(principal.organizationId, principal.userId, id, revision)) return { success: true };
    const current = await this.repository.find(principal.organizationId, principal.userId, id);
    if (!current) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    throw new ApiError(409, 'REVISION_CONFLICT', 'Project has changed since it was loaded.', undefined, false, current.revision);
  }
}
