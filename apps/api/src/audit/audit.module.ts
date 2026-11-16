import { Controller, Get, Global, Module, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.module';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  /** Platform-scoped holders (auditor, platform admin) see everything; institutional holders see their institution only. */
  @Get('events')
  @RequirePermission('audit.read')
  async events(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const institutions = [...new Set(req.auth!.grants.filter((g) => g.permissions.has('audit.read')).map((g) => g.institution))];
    const where = {
      ...(req.scope!.all ? {} : { institution: { in: institutions.filter((i): i is 'POLICE' | 'PRISONS' => !!i) } }),
      ...(q.status ? { outcome: q.status as 'SUCCESS' | 'DENIED' | 'FAILURE' } : {}),
      ...(q.q ? { OR: [{ action: { contains: q.q, mode: 'insensitive' as const } }, { actorEmail: { contains: q.q, mode: 'insensitive' as const } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, ...paging(q) }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return page(items, total, q);
  }
}

@Global()
@Module({ providers: [AuditService], controllers: [AuditController], exports: [AuditService] })
export class AuditModule {}
