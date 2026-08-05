import { Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiError } from '../../../shared/http/api-error.js';

@Controller('api/v1/auth')
export class AuthController {
  @Post('login') @HttpCode(410) login() { throw builtInAuthRemoved(); }
  @Post('forgot-password') @HttpCode(410) forgotPassword() { throw builtInAuthRemoved(); }
  @Post('reset-password') @HttpCode(410) resetPassword() { throw builtInAuthRemoved(); }
  @Post('accept-invitation') @HttpCode(410) acceptInvitation() { throw builtInAuthRemoved(); }
  @Post('logout') @HttpCode(410) logout() { throw builtInAuthRemoved(); }
  @Post('logout-all') @HttpCode(410) logoutAll() { throw builtInAuthRemoved(); }
  @Get('me') @HttpCode(410) me() { throw builtInAuthRemoved(); }
  @Post('change-password') @HttpCode(410) changePassword() { throw builtInAuthRemoved(); }
  @Get('sessions') @HttpCode(410) sessions() { throw builtInAuthRemoved(); }
  @Delete('sessions/:id') @HttpCode(410) revokeSession() { throw builtInAuthRemoved(); }
}

export function builtInAuthRemoved() {
  return new ApiError(410, 'BUILT_IN_AUTH_REMOVED', 'Built-in authentication has been removed. Use the verified external session.');
}
