import { Controller, ForbiddenException, Get, Module, NotFoundException, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AccessScope, AuthedRequest, inScope, unitWhere } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';
import { PoliceCustodyController } from './custody.controller';
import { PoliceRecordsController } from './records.controller';
import { PolicePostingsController } from './postings.controller';
import { PoliceBackgroundCheckController } from './bgcheck.controller';
import { lastMonths, monthStart, rollupBuckets, sumBy, tally } from '../common/reports';

const POLICE = { institution: { code: 'POLICE' as const } };
/** Facility-bound police records visible to the caller: police institution AND inside the caller's command subtree. */
const facilityScope = (scope: AccessScope) => ({ facility: { ...POLICE, orgUnit: unitWhere(scope) } });
const personName = (q?: string) => q ? { OR: [{ surname: { contains: q, mode: 'insensitive' as const } }, { otherNames: { contains: q, mode: 'insensitive' as const } }, { indexNumber: { contains: q, mode: 'insensitive' as const } }] } : {};

@ApiTags('police')
@Controller('police')
export class PoliceController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get('dashboard')
  @RequirePermission('police.dashboard.read')
  async dashboard(@Req() req: AuthedRequest) {
    const fs = facilityScope(req.scope!); const now = new Date(); const d30 = new Date(now.getTime() - 30 * 86400_000);
    const [inCustody, pastDeadline, arrests30d, openCases, personnel, stations, byStation] = await Promise.all([
      this.prisma.policeCustodyEpisode.count({ where: { ...fs, status: 'IN_CUSTODY' } }),
      this.prisma.policeCustodyEpisode.count({ where: { ...fs, status: 'IN_CUSTODY', courtDeadlineAt: { lt: now } } }),
      this.prisma.arrest.count({ where: { ...fs, arrestedAt: { gte: d30 }, voidedAt: null } }),
      this.prisma.policeCase.count({ where: { ...fs, status: { not: 'CLOSED' } } }),
      this.prisma.policePersonnel.count({ where: { currentOrgUnit: unitWhere(req.scope!), status: 'ACTIVE' } }),
      this.prisma.facility.count({ where: { ...POLICE, orgUnit: unitWhere(req.scope!) } }),
      this.prisma.facility.findMany({
        where: { ...POLICE, orgUnit: unitWhere(req.scope!) }, orderBy: { name: 'asc' },
        select: { id: true, name: true, capacity: true, _count: { select: { policeCustody: { where: { status: 'IN_CUSTODY' } } } } },
      }),
    ]);
    return {
      scope: req.scope!.all ? 'ALL' : 'JURISDICTION', inCustody, pastDeadline, arrests30d, openCases, personnel, stations,
      custodyByStation: byStation.map((f) => ({ id: f.id, name: f.name, capacity: f.capacity, inCustody: f._count.policeCustody })),
    };
  }

  /** Roll-up by regional command (or the caller's own unit) plus a six-month arrest trend. Aggregates only. */
  @Get('reports')
  @RequirePermission('police.dashboard.read')
  async reports(@Req() req: AuthedRequest) {
    const buckets = await rollupBuckets(this.prisma, req.scope!, 'POLICE');
    const ids = buckets.flatMap((b) => b.facilityIds); const now = new Date(); const d30 = new Date(now.getTime() - 30 * 86400_000);
    const months = lastMonths(6);
    const [inCustody, overdue, arrests30, openCases, closed30, personnel, units, trend] = await Promise.all([
      this.prisma.policeCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: 'IN_CUSTODY' }, _count: { _all: true } }),
      this.prisma.policeCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: 'IN_CUSTODY', courtDeadlineAt: { lt: now } }, _count: { _all: true } }),
      this.prisma.arrest.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, arrestedAt: { gte: d30 }, voidedAt: null }, _count: { _all: true } }),
      this.prisma.policeCase.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: { not: 'CLOSED' } }, _count: { _all: true } }),
      this.prisma.policeCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, closedAt: { gte: d30 } }, _count: { _all: true } }),
      this.prisma.policePersonnel.findMany({ where: { status: 'ACTIVE', currentOrgUnit: unitWhere(req.scope!) }, select: { currentOrgUnit: { select: { path: true } } } }),
      this.prisma.organizationalUnit.findMany({ where: { id: { in: buckets.map((b) => b.id) } }, select: { id: true, path: true } }),
      this.prisma.arrest.findMany({ where: { facilityId: { in: ids }, voidedAt: null, arrestedAt: { gte: monthStart(months[0]) } }, select: { arrestedAt: true } }),
    ]);
    const pathOf = new Map(units.map((u) => [u.id, u.path]));
    const rows = buckets.map((b) => ({ id: b.id, name: b.name, stations: b.facilityIds.length, inCustody: sumBy(inCustody, b.facilityIds), pastDeadline: sumBy(overdue, b.facilityIds),
      arrests30d: sumBy(arrests30, b.facilityIds), custodyClosed30d: sumBy(closed30, b.facilityIds), openCases: sumBy(openCases, b.facilityIds),
      personnel: personnel.filter((p) => p.currentOrgUnit.path.startsWith(pathOf.get(b.id) ?? '~')).length }));
    const total = rows.reduce((t, r) => ({ stations: t.stations + r.stations, inCustody: t.inCustody + r.inCustody, pastDeadline: t.pastDeadline + r.pastDeadline, arrests30d: t.arrests30d + r.arrests30d,
      custodyClosed30d: t.custodyClosed30d + r.custodyClosed30d, openCases: t.openCases + r.openCases, personnel: t.personnel + r.personnel }),
      { stations: 0, inCustody: 0, pastDeadline: 0, arrests30d: 0, custodyClosed30d: 0, openCases: 0, personnel: 0 });
    // Officers at headquarters and directorates belong to no regional command; report them separately so totals reconcile with the dashboard.
    return { generatedAt: now, rows, total, personnelOutsideCommands: personnel.length - total.personnel, arrestsByMonth: tally(trend.map((t) => t.arrestedAt), months) };
  }

  @Get('custody')
  @RequirePermission('police.custody.read')
  async custody(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { ...facilityScope(req.scope!), ...(q.status ? { status: q.status as never } : {}), ...(q.q ? { person: personName(q.q) } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.policeCustodyEpisode.findMany({
        where, orderBy: { detainedAt: 'desc' }, ...paging(q),
        select: { id: true, reference: true, status: true, detainedAt: true, courtDeadlineAt: true, closedAt: true, cellRef: true,
          person: { select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true } },
          facility: { select: { id: true, name: true } }, arrest: { select: { reference: true, suspectedOffence: true } } },
      }),
      this.prisma.policeCustodyEpisode.count({ where }),
    ]);
    return page(items, total, q);
  }

  @Get('custody/:id')
  @RequirePermission('police.custody.read')
  async custodyDetail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const ep = await this.prisma.policeCustodyEpisode.findUnique({
      where: { id },
      include: { person: { include: { identifiers: true } }, facility: { include: { orgUnit: true } }, arrest: { include: { case: true } }, movements: { orderBy: { occurredAt: 'asc' } } },
    });
    if (!ep) throw new NotFoundException();
    if (!inScope(req.scope!, ep.facility.orgUnit.path)) {
      await this.audit.record(req, { action: 'access.denied', outcome: 'DENIED', permission: 'police.custody.read', entityType: 'police_custody_episode', entityId: id, detail: { reason: 'outside_jurisdiction' } });
      throw new ForbiddenException('This record is outside your jurisdiction');
    }
    await this.audit.record(req, { action: 'police.custody.view', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id });
    return ep;
  }

  @Get('cases')
  @RequirePermission('police.case.read')
  async cases(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { ...facilityScope(req.scope!), ...(q.status ? { status: q.status as never } : {}),
      ...(q.q ? { OR: [{ caseNumber: { contains: q.q, mode: 'insensitive' as const } }, { title: { contains: q.q, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.policeCase.findMany({ where, orderBy: { openedAt: 'desc' }, ...paging(q),
        select: { id: true, caseNumber: true, title: true, offenceCategory: true, status: true, openedAt: true, facility: { select: { name: true } }, _count: { select: { charges: true, arrests: true } } } }),
      this.prisma.policeCase.count({ where }),
    ]);
    return page(items, total, q);
  }

  @Get('personnel')
  @RequirePermission('police.personnel.read')
  async personnel(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { currentOrgUnit: unitWhere(req.scope!),
      ...(q.q ? { OR: [{ surname: { contains: q.q, mode: 'insensitive' as const } }, { otherNames: { contains: q.q, mode: 'insensitive' as const } }, { serviceNumber: { contains: q.q, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.policePersonnel.findMany({ where, orderBy: [{ currentRank: { seniorityOrder: 'asc' } }, { surname: 'asc' }], ...paging(q),
        select: { id: true, serviceNumber: true, surname: true, otherNames: true, status: true,
          currentRank: { select: { name: true, abbreviation: true } }, currentOrgUnit: { select: { name: true, type: { select: { name: true } } } },
          commands: { where: { effectiveTo: null }, select: { acting: true, appointment: { select: { title: true } } } } } }),
      this.prisma.policePersonnel.count({ where }),
    ]);
    return page(items, total, q);
  }

  @Get('stations')
  @RequirePermission('police.facility.read')
  async stations(@Req() req: AuthedRequest) {
    return this.prisma.facility.findMany({ where: { ...POLICE, orgUnit: unitWhere(req.scope!) }, orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, capacity: true, operationalStatus: true, isSynthetic: true, facilityType: { select: { name: true } },
        orgUnit: { select: { name: true, parent: { select: { name: true, parent: { select: { name: true, parent: { select: { name: true } } } } } } } } } });
  }
}

@Module({ controllers: [PoliceController, PoliceCustodyController, PoliceRecordsController, PolicePostingsController, PoliceBackgroundCheckController] })
export class PoliceModule {}
