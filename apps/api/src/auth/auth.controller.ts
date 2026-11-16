import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { Public } from './decorators';
import { AuthedRequest, clientIp } from '../common/access';

class LoginDto {
  @ApiProperty() @IsEmail() @MaxLength(200) email: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly audit: AuditService) {}

  @Public()
  @Throttle({ default: { limit: Number(process.env.LOGIN_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, clientIp(req), req.headers['user-agent']);
    if ('reason' in result) {
      await this.audit.record(req, { action: 'auth.login', outcome: 'DENIED', actorEmail: dto.email, detail: { reason: result.reason } });
      throw new UnauthorizedException('Invalid email or password'); // deliberately generic
    }
    res.cookie(this.auth.cookieName, result.token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: this.auth.ttlMs,
    });
    req.auth = (await this.auth.resolve(result.token)) ?? undefined;
    await this.audit.record(req, { action: 'auth.login', outcome: 'SUCCESS' });
    return req.auth!.user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.auth!.sessionId);
    await this.audit.record(req, { action: 'auth.logout', outcome: 'SUCCESS' });
    res.clearCookie(this.auth.cookieName, { path: '/' });
  }

  @Get('me')
  me(@Req() req: AuthedRequest) { return req.auth!.user; }
}
