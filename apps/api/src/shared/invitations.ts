import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import { ACCESS_PROFILES, ROLES, type AccessProfile } from '@nexcust/contracts';
import { hashPassword } from '@nexcust/database';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { Public, RequirePermission } from '../auth/decorators';
import { AuthedRequest, clientIp } from '../common/access';
import { invitationEmail, mailConfigured, sendMail } from '../common/mail';
import { ListQuery, page, paging } from '../common/pagination';

const INVITE_HOURS = 72;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const PROFILE_CODES = Object.keys(ACCESS_PROFILES) as AccessProfile[];
/** Public address of the web app, used in invitation links. */
const baseUrl = () => (process.env.APP_BASE_URL ?? (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0]).trim().replace(/\/$/, '');

export type InvitationState = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export const stateOf = (i: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }): InvitationState =>
  i.acceptedAt ? 'ACCEPTED' : i.revokedAt ? 'REVOKED' : i.expiresAt <= new Date() ? 'EXPIRED' : 'PENDING';

class CreateInvitationDto {
  @ApiProperty() @IsEmail() @MaxLength(200) email: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) @Matches(/\S/) displayName: string;
  @ApiProperty({ enum: PROFILE_CODES }) @IsIn(PROFILE_CODES) access: AccessProfile;
}
class TokenDto {
  @ApiProperty() @IsString() @Matches(/^[\w-]{32,100}$/, { message: 'This invitation link is not valid.' }) token: string;
}
class AcceptDto extends TokenDto {
  @ApiProperty() @IsString() @MinLength(12, { message: 'Choose a password of at least 12 characters.' }) @MaxLength(200) password: string;
}
class InvitationListQuery extends ListQuery {
  @ApiPropertyOptional() @IsOptional() @IsIn(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']) state?: InvitationState;
}
class UserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] }) @IsIn(['ACTIVE', 'SUSPENDED']) status: 'ACTIVE' | 'SUSPENDED';
}

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Issues a fresh single-use token for an invitation and emails it. The raw link is returned to the administrator once. */
  async issue(req: AuthedRequest, invitationId: string, action: 'admin.invitation.create' | 'admin.invitation.resend') {
    const token = randomBytes(32).toString('base64url');
    const inv = await this.prisma.invitation.update({ where: { id: invitationId }, data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) } });
    // The token travels in the fragment, which browsers never send to a server, so it stays out of request logs.
    const link = `${baseUrl()}/accept#token=${token}`;
    const profile = ACCESS_PROFILES[inv.access as AccessProfile];
    const mail = invitationEmail({ name: inv.displayName, inviter: req.auth!.user.displayName, accessName: profile.name, accessDescription: profile.description, link, expiresHours: INVITE_HOURS });
    const sent = await sendMail(inv.email, mail.subject, mail.text, mail.html);
    await this.prisma.invitation.update({ where: { id: inv.id }, data: { emailStatus: sent.status } });
    await this.audit.record(req, { action, outcome: 'SUCCESS', entityType: 'Invitation', entityId: inv.id, permission: 'platform.users.manage',
      detail: { email: inv.email, access: inv.access, emailStatus: sent.status } });
    return { id: inv.id, link, emailed: sent.sent, emailStatus: sent.status, emailReason: sent.reason ?? null, expiresAt: inv.expiresAt };
  }

  /** The invitation a token opens, if it can still be used. */
  async usable(token: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { tokenHash: sha256(token) } });
    return inv && stateOf(inv) === 'PENDING' ? inv : null;
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminInvitationsController {
  constructor(private readonly prisma: PrismaService, private readonly invitations: InvitationService, private readonly audit: AuditService, private readonly auth: AuthService) {}

  @Get('invitations')
  @RequirePermission('platform.users.manage')
  async list(@Query() q: InvitationListQuery) {
    const now = new Date();
    const where = {
      ...(q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' as const } }, { displayName: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
      ...(q.state === 'PENDING' ? { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }
        : q.state === 'ACCEPTED' ? { acceptedAt: { not: null } }
        : q.state === 'REVOKED' ? { revokedAt: { not: null } }
        : q.state === 'EXPIRED' ? { acceptedAt: null, revokedAt: null, expiresAt: { lte: now } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.invitation.findMany({ where, orderBy: { createdAt: 'desc' }, ...paging(q),
        select: { id: true, email: true, displayName: true, access: true, emailStatus: true, createdAt: true, expiresAt: true, acceptedAt: true, revokedAt: true,
          invitedBy: { select: { displayName: true } } } }),
      this.prisma.invitation.count({ where }),
    ]);
    return page(items.map((i) => ({ ...i, state: stateOf(i), accessName: ACCESS_PROFILES[i.access as AccessProfile]?.name ?? i.access })), total, q);
  }

  @Get('invitations/meta')
  @RequirePermission('platform.users.manage')
  meta() {
    return { emailConfigured: mailConfigured(), expiresHours: INVITE_HOURS,
      profiles: PROFILE_CODES.map((code) => ({ code, ...ACCESS_PROFILES[code], roleNames: ACCESS_PROFILES[code].roles.map((r) => ROLES.find((x) => x.code === r)!.name) })) };
  }

  @Post('invitations')
  @RequirePermission('platform.users.manage')
  async create(@Body() dto: CreateInvitationDto, @Req() req: AuthedRequest) {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('That email already has an account.');
    if (await this.prisma.invitation.findFirst({ where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }))
      throw new ConflictException('That email already has an open invitation. Resend it from the list instead.');
    const inv = await this.prisma.invitation.create({ data: { email, displayName: dto.displayName.trim(), access: dto.access, invitedById: req.auth!.user.id,
      tokenHash: sha256(randomBytes(32).toString('base64url')), expiresAt: new Date() } });
    return this.invitations.issue(req, inv.id, 'admin.invitation.create');
  }

  /** New link (the old one stops working) and a fresh 72-hour window. */
  @Post('invitations/:id/resend')
  @HttpCode(200)
  @RequirePermission('platform.users.manage')
  async resend(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const inv = await this.prisma.invitation.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt || inv.revokedAt) throw new ConflictException(`This invitation was ${inv.acceptedAt ? 'accepted' : 'revoked'}; send a new one instead.`);
    return this.invitations.issue(req, inv.id, 'admin.invitation.resend');
  }

  @Post('invitations/:id/revoke')
  @HttpCode(200)
  @RequirePermission('platform.users.manage')
  async revoke(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const { count } = await this.prisma.invitation.updateMany({ where: { id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!count) throw new ConflictException('Only an open invitation can be revoked.');
    await this.audit.record(req, { action: 'admin.invitation.revoke', outcome: 'SUCCESS', entityType: 'Invitation', entityId: id, permission: 'platform.users.manage' });
    return { ok: true };
  }

  /** Suspend or restore an account. Suspension ends its sessions at once. */
  @Post('users/:id/status')
  @HttpCode(200)
  @RequirePermission('platform.users.manage')
  async status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UserStatusDto, @Req() req: AuthedRequest) {
    if (id === req.auth!.user.id) throw new BadRequestException('You cannot change the status of your own account.');
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roleAssignments: { include: { role: true } } } });
    if (!user) throw new NotFoundException('Account not found');
    if (dto.status === 'SUSPENDED' && user.roleAssignments.some((a) => a.role.code === 'PLATFORM_ADMIN')) {
      const admins = await this.prisma.user.count({ where: { status: 'ACTIVE', roleAssignments: { some: { role: { code: 'PLATFORM_ADMIN' } } } } });
      if (admins <= 1) throw new BadRequestException('There must be at least one active administrator.');
    }
    await this.prisma.user.update({ where: { id }, data: { status: dto.status } });
    if (dto.status !== 'ACTIVE') await this.auth.endAllSessions(id);
    await this.audit.record(req, { action: 'admin.user.status', outcome: 'SUCCESS', entityType: 'User', entityId: id, permission: 'platform.users.manage', detail: { email: user.email, status: dto.status } });
    return { ok: true };
  }
}

/** Signed-out steps of an invitation: see who it is for, then choose a password. */
@ApiTags('auth')
@Controller('auth/invitation')
export class InvitationAcceptController {
  constructor(private readonly prisma: PrismaService, private readonly invitations: InvitationService, private readonly audit: AuditService, private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: Number(process.env.LOGIN_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post()
  @HttpCode(200)
  async preview(@Body() dto: TokenDto) {
    const inv = await this.invitations.usable(dto.token);
    if (!inv) throw new BadRequestException('This invitation has expired, was already used or was withdrawn. Ask the person who invited you for a new one.');
    const profile = ACCESS_PROFILES[inv.access as AccessProfile];
    return { email: inv.email, displayName: inv.displayName, accessName: profile.name, accessDescription: profile.description, expiresAt: inv.expiresAt };
  }

  @Public()
  @Throttle({ default: { limit: Number(process.env.LOGIN_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post('accept')
  @HttpCode(200)
  async accept(@Body() dto: AcceptDto, @Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    const inv = await this.invitations.usable(dto.token);
    if (!inv) {
      await this.audit.record(req, { action: 'auth.invitation.accept', outcome: 'DENIED', detail: { reason: 'unusable_token' } });
      throw new BadRequestException('This invitation has expired, was already used or was withdrawn. Ask the person who invited you for a new one.');
    }
    if (dto.password.toLowerCase().includes(inv.email.split('@')[0].toLowerCase())) throw new BadRequestException('Choose a password that does not contain your email name.');
    const profile = ACCESS_PROFILES[inv.access as AccessProfile];
    const roles = await this.prisma.role.findMany({ where: { code: { in: [...profile.roles] } }, include: { institution: true } });
    if (roles.length !== profile.roles.length) throw new ConflictException('This access profile is not set up on the platform yet. Contact the administrator.');
    // ORG_UNIT roles are held at their institution's national headquarters: the root of its command tree.
    const roots = await this.prisma.organizationalUnit.findMany({ where: { parentId: null }, include: { institution: true } });
    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      // Claim the invitation first; a second, simultaneous acceptance finds nothing left to claim.
      const claimed = await tx.invitation.updateMany({ where: { id: inv.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('This invitation was already used.');
      if (await tx.user.findUnique({ where: { email: inv.email } })) throw new ConflictException('An account with this email already exists. Sign in instead.');
      const u = await tx.user.create({ data: { email: inv.email, displayName: inv.displayName, passwordHash } });
      for (const code of profile.roles) {
        const role = roles.find((r) => r.code === code)!;
        const orgUnitId = role.scopeLevel === 'ORG_UNIT' ? roots.find((r) => r.institution.code === role.institution?.code)?.id : null;
        if (role.scopeLevel === 'ORG_UNIT' && !orgUnitId) throw new ConflictException(`No national headquarters is set up for ${role.institution?.code}.`);
        await tx.userRoleAssignment.create({ data: { userId: u.id, roleId: role.id, orgUnitId } });
      }
      await tx.invitation.update({ where: { id: inv.id }, data: { userId: u.id } });
      return u;
    });
    const token = await this.auth.startSession(user.id, clientIp(req), req.headers['user-agent']);
    res.cookie(this.auth.cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: this.auth.ttlMs });
    req.auth = (await this.auth.resolve(token)) ?? undefined;
    await this.audit.record(req, { action: 'auth.invitation.accept', outcome: 'SUCCESS', entityType: 'Invitation', entityId: inv.id, detail: { access: inv.access } });
    return req.auth!.user;
  }
}
