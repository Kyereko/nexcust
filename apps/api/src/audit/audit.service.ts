import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuthedRequest, clientIp } from '../common/access';

export interface AuditInput {
  action: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  entityType?: string;
  entityId?: string;
  permission?: string;
  actorEmail?: string;
  detail?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly log = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  /** Append an audit event. Never throws into the request path. */
  async record(req: AuthedRequest | null, e: AuditInput) {
    try {
      const auth = req?.auth;
      await this.prisma.auditEvent.create({
        data: {
          action: e.action, outcome: e.outcome, entityType: e.entityType, entityId: e.entityId, permission: e.permission,
          actorId: auth?.user.id, actorEmail: auth?.user.email ?? e.actorEmail,
          institution: auth?.grants.find((g) => g.institution)?.institution ?? null,
          ipAddress: req ? clientIp(req) : null, requestMethod: req?.method, requestPath: req?.originalUrl?.split('?')[0],
          detail: e.detail as object | undefined,
        },
      });
    } catch (err) {
      this.log.error(`Failed to write audit event ${e.action}: ${(err as Error).message}`);
    }
  }
}
