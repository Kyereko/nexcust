import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { verifyPassword } from '@nexcust/database';
import type { Permission, SessionUser } from '@nexcust/contracts';
import { PrismaService } from '../prisma/prisma.module';
import { AuthContext, Grant } from '../common/access';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
// Constant work for unknown accounts so response time does not reveal which emails exist.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  get cookieName() { return process.env.SESSION_COOKIE_NAME ?? 'nx_session'; }
  get ttlMs() { return Number(process.env.SESSION_TTL_HOURS ?? 8) * 3600_000; }

  /** Returns a raw session token on success; null on any failure (caller responds generically). */
  async login(email: string, password: string, ip: string, userAgent?: string): Promise<{ token: string; userId: string } | { reason: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) { await verifyPassword(password, DUMMY_HASH); return { reason: 'unknown_account' }; }
    if (user.status !== 'ACTIVE') return { reason: 'account_not_active' };
    if (user.lockedUntil && user.lockedUntil > new Date()) return { reason: 'account_locked' };
    if (!(await verifyPassword(password, user.passwordHash))) {
      const failed = user.failedLoginCount + 1;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } });
      return { reason: failed >= MAX_FAILED ? 'account_locked' : 'bad_password' };
    }
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.session.create({ data: { userId: user.id, tokenHash: sha256(token), ipAddress: ip, userAgent: userAgent?.slice(0, 250), expiresAt: new Date(Date.now() + this.ttlMs) } }),
      this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    ]);
    return { token, userId: user.id };
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Resolve a cookie token into the caller's identity, role assignments and permissions. */
  async resolve(token: string | undefined): Promise<AuthContext | null> {
    if (!token) return null;
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { roleAssignments: {
        where: { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
        include: { orgUnit: { include: { type: true } }, role: { include: { institution: true, permissions: { include: { permission: true } } } } },
      } } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now || session.user.status !== 'ACTIVE') return null;
    const { user } = session;
    const grants: Grant[] = user.roleAssignments.map((a) => ({
      roleCode: a.role.code, institution: a.role.institution?.code ?? null, scopeLevel: a.role.scopeLevel,
      path: a.orgUnit?.path ?? null, permissions: new Set(a.role.permissions.map((p) => p.permission.code)),
    }));
    const sessionUser: SessionUser = {
      id: user.id, email: user.email, displayName: user.displayName,
      workspace: (user.roleAssignments[0]?.role.workspace ?? 'applicant') as SessionUser['workspace'],
      assignments: user.roleAssignments.map((a) => ({
        roleCode: a.role.code, roleName: a.role.name, institution: a.role.institution?.code ?? null, scopeLevel: a.role.scopeLevel as 'PLATFORM' | 'ORG_UNIT' | 'SELF',
        orgUnitId: a.orgUnitId, orgUnitName: a.orgUnit?.name ?? null, orgUnitType: a.orgUnit?.type.name ?? null,
      })),
      permissions: [...new Set(grants.flatMap((g) => [...g.permissions]))] as Permission[],
    };
    return { sessionId: session.id, user: sessionUser, grants };
  }
}
