import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from '../application/auth.service.js';

type LoginBody = { email?: string; password?: string; name?: string };

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) reply: FastifyReply) {
    const { user, session } = await this.auth.login(String(body.email || ''), String(body.password || ''));
    reply.setCookie('mini_bi_session', session, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie('mini_bi_session', { path: '/' });
    return { success: true };
  }

  @Get('me')
  me() {
    return { id: 'user-development', organizationId: 'org-default', email: 'dev@example.com', name: 'Development User', roles: ['owner'] };
  }
}
