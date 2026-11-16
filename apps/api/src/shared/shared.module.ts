import { BadRequestException, Controller, Get, Module, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { Public, RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';

@ApiTags('shared')
@Controller()
export class SharedController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Public()
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? 'DEMONSTRATION', notice: 'Synthetic data only. Not an official system.' };
  }

  /**
   * National Person Index search — IDENTITY ONLY. Returns no arrest, conviction or custody facts;
   * those are served only by the owning institution's endpoints. Every search is audited.
   */
  @Get('persons')
  @RequirePermission('person.read')
  async persons(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const term = q.q?.trim();
    if (!term || term.length < 2) throw new BadRequestException('Enter at least 2 characters to search the person index');
    const where = { OR: [
      { surname: { contains: term, mode: 'insensitive' as const } }, { otherNames: { contains: term, mode: 'insensitive' as const } },
      { indexNumber: { equals: term, mode: 'insensitive' as const } }, { identifiers: { some: { value: { equals: term, mode: 'insensitive' as const } } } },
    ] };
    const [items, total] = await Promise.all([
      this.prisma.person.findMany({ where, orderBy: [{ surname: 'asc' }, { otherNames: 'asc' }], ...paging(q),
        select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, hometown: true, isSynthetic: true,
          identifiers: { select: { type: true, value: true, verified: true } } } }),
      this.prisma.person.count({ where }),
    ]);
    await this.audit.record(req, { action: 'person.search', outcome: 'SUCCESS', detail: { term, results: total } });
    return page(items, total, q);
  }

  /** Configurable institutional reference data with its evidence status. Authenticated users only. */
  @Get('reference')
  async reference(@Req() req: AuthedRequest) {
    const codes = [...new Set(req.auth!.grants.map((g) => g.institution).filter((i): i is 'POLICE' | 'PRISONS' => !!i))];
    const inst = codes.length ? { institution: { code: { in: codes } } } : {};
    const sel = { institution: { select: { code: true } } };
    const [ranks, appointments, orgUnitTypes, facilityTypes] = await Promise.all([
      this.prisma.rank.findMany({ where: inst, orderBy: [{ institutionId: 'asc' }, { seniorityOrder: 'asc' }], include: sel }),
      this.prisma.appointment.findMany({ where: inst, orderBy: { title: 'asc' }, include: sel }),
      this.prisma.orgUnitType.findMany({ where: inst, orderBy: [{ institutionId: 'asc' }, { level: 'asc' }], include: sel }),
      this.prisma.facilityType.findMany({ where: inst, orderBy: { name: 'asc' }, include: sel }),
    ]);
    return { ranks, appointments, orgUnitTypes, facilityTypes };
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @RequirePermission('platform.users.manage')
  async users(@Query() q: ListQuery) {
    const where = q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' as const } }, { displayName: { contains: q.q, mode: 'insensitive' as const } }] } : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { email: 'asc' }, ...paging(q),
        select: { id: true, email: true, displayName: true, status: true, lastLoginAt: true,
          roleAssignments: { select: { role: { select: { name: true, code: true } }, orgUnit: { select: { name: true } } } } } }),
      this.prisma.user.count({ where }),
    ]);
    return page(items, total, q);
  }
}

@Module({ controllers: [SharedController, AdminController] })
export class SharedModule {}
