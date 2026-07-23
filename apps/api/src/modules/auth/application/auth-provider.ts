export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  roles: string[];
};

export interface AuthProvider {
  authenticate(email: string, password: string): Promise<AuthenticatedUser>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
