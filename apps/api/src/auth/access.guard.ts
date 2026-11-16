import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@nexcust/contracts';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { IS_PUBLIC, PERMISSION } from './decorators';
import { AuthedRequest, resolveScope } from '../common/access';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Single global gate. Deny by default:
 *  1. CSRF: state-changing requests must come from an allowed Origin.
 *  2. Authentication: valid server-side session (unless @Public).
 *  3. Authorization: route must declare @RequirePermission; caller must hold it. The resolved
 *     jurisdiction is attached as req.scope and MUST be applied by the handler's queries.
 * Every refusal is written to the audit trail.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService, private readonly audit: AuditService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const targets = [ctx.getHandler(), ctx.getClass()];

    if (!SAFE.has(req.method)) {
      const allowed = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim());
      const origin = req.headers.origin;
      if (origin && !allowed.includes(origin)) {
        await this.audit.record(req, { action: 'security.csrf_origin_rejected', outcome: 'DENIED', detail: { origin } });
        throw new ForbiddenException('Origin not allowed');
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    req.auth = (await this.auth.resolve(req.cookies?.[this.auth.cookieName])) ?? undefined;
    if (isPublic) return true;
    if (!req.auth) throw new UnauthorizedException('Authentication required');

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION, targets);
    if (!permission) return true; // authenticated-only route (e.g. /auth/me)
    const scope = resolveScope(req.auth, permission);
    if (!scope) {
      await this.audit.record(req, { action: 'access.denied', outcome: 'DENIED', permission, detail: { reason: 'missing_permission' } });
      throw new ForbiddenException('You are not authorized to perform this action');
    }
    req.scope = scope;
    return true;
  }
}
