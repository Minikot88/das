import { describe, expect, it } from 'vitest';
import { AuthController } from './auth.controller.js';
import { LegacyAuthController } from './legacy-auth.controller.js';

describe('removed built-in authentication endpoints', () => {
  it.each([
    () => new AuthController().login(),
    () => new AuthController().forgotPassword(),
    () => new AuthController().resetPassword(),
    () => new AuthController().acceptInvitation(),
    () => new AuthController().logout(),
    () => new AuthController().logoutAll(),
    () => new AuthController().me(),
    () => new AuthController().changePassword(),
    () => new AuthController().sessions(),
    () => new AuthController().revokeSession(),
    () => new LegacyAuthController().login(),
    () => new LegacyAuthController().register(),
  ])('returns Gone instead of executing a credential or cookie-session action', action => {
    expect(action).toThrow(expect.objectContaining({
      status: 410,
      code: 'BUILT_IN_AUTH_REMOVED',
    }));
  });
});
