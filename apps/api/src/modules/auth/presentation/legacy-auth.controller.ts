import { Controller, HttpCode, Post } from '@nestjs/common';
import { builtInAuthRemoved } from './auth.controller.js';

@Controller('api/auth')
export class LegacyAuthController {
  @Post('login') @HttpCode(410) login() { throw builtInAuthRemoved(); }
  @Post('register') @HttpCode(410) register() { throw builtInAuthRemoved(); }
}
