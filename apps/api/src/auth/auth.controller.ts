import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { OPS_ROLES } from './admin-roles.js'
import { Roles } from './auth.decorators.js'
import { AuthService } from './auth.service.js'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(
    @Body() body: { login?: string; password?: string; totp?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(body, req, res)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res)
  }

  @Get('me')
  async me(@Req() req: Request) {
    const admin = await this.auth.requireAdmin(req)
    return this.auth.publicAdmin(admin)
  }

  @Get('otp')
  async otp() {
    return { required: await this.auth.otpRequired() }
  }

  @Patch('otp')
  @Roles(...OPS_ROLES)
  setOtp(@Body() body: { required?: boolean }) {
    if (typeof body?.required !== 'boolean') {
      throw new BadRequestException('required 값이 필요합니다.')
    }
    return this.auth.setOtpRequired(body.required)
  }
}
