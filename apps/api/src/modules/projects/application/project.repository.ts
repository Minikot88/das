export type ProjectRecord = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  status: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export interface ProjectRepository {
  list(organizationId: string): Promise<ProjectRecord[]>;
  find(organizationId: string, id: string): Promise<ProjectRecord | null>;
  create(record: ProjectRecord): Promise<ProjectRecord>;
  update(organizationId: string, id: string, expectedRevision: number, name: string): Promise<ProjectRecord | null>;
  softDelete(organizationId: string, id: string, expectedRevision: number): Promise<boolean>;
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
