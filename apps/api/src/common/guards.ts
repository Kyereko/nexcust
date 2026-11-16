import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AccessScope, AuthedRequest, inScope } from './access';

/** Refuse (and audit) when a record's organizational unit is outside the caller's jurisdiction. */
export async function assertInScope(audit: AuditService, req: AuthedRequest, scope: AccessScope, unitPath: string, entityType: string, entityId: string) {
  if (inScope(scope, unitPath)) return;
  await audit.record(req, { action: 'access.denied', outcome: 'DENIED', permission: scope.permission, entityType, entityId, detail: { reason: 'outside_jurisdiction' } });
  throw new ForbiddenException('This record is outside your jurisdiction');
}

/** Maker–checker: the person who authorizes must not be the person who initiated. */
export async function assertDifferentActor(audit: AuditService, req: AuthedRequest, makerId: string | null, action: string, entityType: string, entityId: string) {
  if (!makerId || makerId !== req.auth!.user.id) return;
  await audit.record(req, { action, outcome: 'DENIED', entityType, entityId, detail: { reason: 'maker_checker_same_user' } });
  throw new ConflictException('A different authorized officer must approve this action (maker–checker rule)');
}
