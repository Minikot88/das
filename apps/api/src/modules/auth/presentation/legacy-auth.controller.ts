import { Body, Controller, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from '../application/auth.service.js';

@Controller('api/auth')
export class LegacyAuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(['login', 'register'])
  async login(@Body() body: { email?: string; password?: string }, @Res({ passthrough: true }) reply: FastifyReply) {
    const { user, session } = await this.auth.login(String(body.email || ''), String(body.password || ''));
    reply.setCookie('mini_bi_session', session, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
    return user;
  }
}
