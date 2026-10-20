import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { MINUTE_MS } from '../security/security.module.js';
import { CurrentUser, LoginRequired } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import type { AuthRequest, AuthUser } from './auth.types.js';
import {
  ChangeNicknameDto,
  ChangePasswordDto,
  LoginDto,
  SignupDto,
  WithdrawDto,
} from './dto/auth.dto.js';
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60 * MINUTE_MS } })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.signup(dto);
    setSessionCookie(res, token);
    return user;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 10 * MINUTE_MS } })
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

  @Delete('me')
  @LoginRequired()
  @HttpCode(204)
  async withdraw(
    @CurrentUser() user: AuthUser,
    @Body() dto: WithdrawDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.withdraw(user, dto);
    clearSessionCookie(res);
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

  @Patch('me/nickname')
  @LoginRequired()
  changeNickname(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeNicknameDto,
  ) {
    return this.authService.changeNickname(user, dto);
  }
}
