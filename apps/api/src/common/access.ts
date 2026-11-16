import type { Request } from 'express';
import { CLIENT_IP_HEADER, gatewayVerified } from './gateway';
import type { Permission, SessionUser } from '@nexcust/contracts';

/** One role assignment, resolved for authorization decisions. */
export interface Grant {
  roleCode: string;
  institution: 'POLICE' | 'PRISONS' | null;
  scopeLevel: string;
  /** Materialised path of the assigned org unit; null for PLATFORM / SELF roles. */
  path: string | null;
  permissions: Set<string>;
}

export interface AuthContext {
  sessionId: string;
  user: SessionUser;
  grants: Grant[];
}

/** Jurisdiction resolved for ONE permission: the org-unit subtrees the caller may act in. */
export interface AccessScope {
  permission: Permission;
  all: boolean;
  paths: string[];
}

export type AuthedRequest = Request & { auth?: AuthContext; scope?: AccessScope };

export function resolveScope(auth: AuthContext, permission: Permission): AccessScope | null {
  const grants = auth.grants.filter((g) => g.permissions.has(permission));
  if (!grants.length) return null;
  // Defence in depth: an institution-namespaced permission only counts when granted through a role of that institution.
  const ns = permission.startsWith('police.') ? 'POLICE' : permission.startsWith('prisons.') ? 'PRISONS' : null;
  const valid = ns ? grants.filter((g) => g.institution === ns) : grants;
  if (!valid.length) return null;
  const all = valid.some((g) => g.scopeLevel === 'PLATFORM');
  return { permission, all, paths: all ? [] : valid.map((g) => g.path).filter((p): p is string => !!p) };
}

/** Prisma `where` fragment for OrganizationalUnit restricted to the caller's subtrees. */
export function unitWhere(scope: AccessScope) {
  if (scope.all) return {};
  if (!scope.paths.length) return { id: '00000000-0000-0000-0000-000000000000' }; // matches nothing
  return { OR: scope.paths.map((p) => ({ path: { startsWith: p } })) };
}

export const inScope = (scope: AccessScope, unitPath: string) => scope.all || scope.paths.some((p) => unitPath.startsWith(p));

/** Caller's IP: the web tier's forwarded value when the request came through the gateway, else the socket peer. */
export function clientIp(req: Request): string {
  const forwarded = req.headers[CLIENT_IP_HEADER];
  if (process.env.API_GATEWAY_SECRET && typeof forwarded === 'string' && forwarded && gatewayVerified(req)) return forwarded.slice(0, 64);
  return (req.ip ?? req.socket?.remoteAddress ?? 'unknown').replace('::ffff:', '');
}
