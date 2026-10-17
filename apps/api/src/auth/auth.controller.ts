import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, LoginRequired } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { AuthRequest, AuthUser } from './auth.types.js';
import { ChangePasswordDto, LoginDto, SignupDto } from './dto/auth.dto.js';
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.signup(dto);
    setSessionCookie(res, token);
    return user;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(dto);
    setSessionCookie(res, token);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(readSessionToken(req));
    clearSessionCookie(res);
  }

  @Get('me')
  @LoginRequired()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me/password')
  @LoginRequired()
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user, readSessionToken(req), dto);
  }
}
