import { Controller, ForbiddenException, Get, Module, NotFoundException, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AccessScope, AuthedRequest, inScope, unitWhere } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';
import { canSeeJuvenile, protectPerson } from '../common/juvenile';
import { BadRequestException } from '@nestjs/common';
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
class StationQuery extends ListQuery {
  /** Path of a regional command unit, to list only its stations. */
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[\/0-9a-f-]+$/) @MaxLength(200) command?: string;
}

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
      // Stations holding people now, busiest first (a national scope has hundreds of stations, most with nobody in cells).
      this.prisma.policeCustodyEpisode.groupBy({ by: ['facilityId'], where: { ...fs, status: 'IN_CUSTODY' }, _count: { _all: true } }),
    ]);
    const top = byStation.sort((a, b) => b._count._all - a._count._all).slice(0, 12);
    const names = new Map((await this.prisma.facility.findMany({ where: { id: { in: top.map((t) => t.facilityId) } }, select: { id: true, name: true, capacity: true } })).map((f) => [f.id, f]));
    return {
      scope: req.scope!.all ? 'ALL' : 'JURISDICTION', inCustody, pastDeadline, arrests30d, openCases, personnel, stations, stationsHolding: byStation.length,
      custodyByStation: top.map((t) => ({ id: t.facilityId, name: names.get(t.facilityId)?.name ?? '', capacity: names.get(t.facilityId)?.capacity ?? null, inCustody: t._count._all })),
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
        select: { id: true, reference: true, status: true, detainedAt: true, courtDeadlineAt: true, closedAt: true, cellRef: true, isJuvenile: true,
          person: { select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true } },
          facility: { select: { id: true, name: true } }, arrest: { select: { reference: true, suspectedOffence: true } } },
      }),
      this.prisma.policeCustodyEpisode.count({ where }),
    ]);
    const see = canSeeJuvenile(req.auth);
    return page(items.map((i) => (i.isJuvenile && !see ? { ...i, person: protectPerson(i.person) } : i)), total, q);
  }

  /**
   * Return under s.16 of Act 30: each month the officer in charge reports to the District Magistrate the persons
   * arrested without warrant and not charged, stating whether they were admitted to bail.
   */
  @Get('reports/s16')
  @RequirePermission('police.dashboard.read')
  async s16Return(@Req() req: AuthedRequest, @Query('month') month?: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('Month must be YYYY-MM');
    const from = new Date(`${m}-01T00:00:00Z`); const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
    const arrests = await this.prisma.arrest.findMany({
      where: { ...facilityScope(req.scope!), arrestedAt: { gte: from, lt: to }, voidedAt: null, arrestBasis: { in: ['WITHOUT_WARRANT_S10', 'PRIVATE_PERSON_S12'] }, charges: { none: {} } },
      orderBy: [{ facility: { name: 'asc' } }, { arrestedAt: 'asc' }],
      select: { id: true, reference: true, arrestedAt: true, suspectedOffence: true, arrestBasis: true, facility: { select: { id: true, name: true } },
        person: { select: { id: true, indexNumber: true, surname: true, otherNames: true } },
        custodyEpisodes: { select: { status: true, isJuvenile: true, closedAt: true, bailBond: { select: { reportTo: true, reportAt: true } } } } } });
    const see = canSeeJuvenile(req.auth);
    const rows = arrests.map((a) => {
      const ep = a.custodyEpisodes[0]; const juvenile = !!ep?.isJuvenile;
      return { id: a.id, reference: a.reference, station: a.facility.name, arrestedAt: a.arrestedAt, suspectedOffence: a.suspectedOffence, arrestBasis: a.arrestBasis,
        person: juvenile && !see ? protectPerson(a.person) : a.person, juvenile,
        custodyStatus: ep?.status ?? 'NOT_DETAINED', admittedToBail: ep?.status === 'RELEASED_ON_BAIL', bail: ep?.bailBond ?? null };
    });
    await this.audit.record(req, { action: 'police.report.s16', outcome: 'SUCCESS', detail: { month: m, rows: rows.length } });
    return { month: m, generatedAt: new Date(), rows, stations: [...new Set(rows.map((r) => r.station))] };
  }

  @Get('custody/:id')
  @RequirePermission('police.custody.read')
  async custodyDetail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const ep = await this.prisma.policeCustodyEpisode.findUnique({
      where: { id },
      include: { person: { include: { identifiers: true } }, facility: { include: { orgUnit: true } }, arrest: { include: { case: true } }, movements: { orderBy: { occurredAt: 'asc' } }, bailBond: true,
        property: { orderBy: { recordedAt: 'asc' } } },
    });
    if (!ep) throw new NotFoundException();
    if (!inScope(req.scope!, ep.facility.orgUnit.path)) {
      await this.audit.record(req, { action: 'access.denied', outcome: 'DENIED', permission: 'police.custody.read', entityType: 'police_custody_episode', entityId: id, detail: { reason: 'outside_jurisdiction' } });
      throw new ForbiddenException('This record is outside your jurisdiction');
    }
    const protect = ep.isJuvenile && !canSeeJuvenile(req.auth);
    await this.audit.record(req, { action: 'police.custody.view', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id, detail: ep.isJuvenile ? { juvenile: true, identityShown: !protect } : undefined });
    return protect ? { ...ep, person: protectPerson(ep.person) } : ep;
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

  /** Searchable, paginated station register with each unit's command chain, evidence status and source. */
  @Get('stations/directory')
  @RequirePermission('police.facility.read')
  async directory(@Req() req: AuthedRequest, @Query() q: StationQuery) {
    const scoped = unitWhere(req.scope!);
    const where = { ...POLICE, orgUnit: { AND: [scoped, ...(q.command ? [{ path: { startsWith: q.command } }] : [])] },
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' as const } }, { town: { contains: q.q, mode: 'insensitive' as const } }] } : {}) };
    const chain = { select: { name: true, type: { select: { code: true } }, parent: { select: { name: true, type: { select: { code: true } }, parent: { select: { name: true, type: { select: { code: true } }, parent: { select: { name: true, type: { select: { code: true } } } } } } } } } };
    const [rows, total, commands] = await Promise.all([
      this.prisma.facility.findMany({ where, orderBy: { name: 'asc' }, ...paging(q),
        select: { id: true, code: true, name: true, town: true, coordPrecision: true, facilityType: { select: { name: true } },
          orgUnit: { select: { verificationStatus: true, sourceRef: true, parent: chain } }, _count: { select: { policeCustody: { where: { status: 'IN_CUSTODY' } } } } } }),
      this.prisma.facility.count({ where }),
      this.prisma.organizationalUnit.findMany({ where: { ...POLICE, type: { code: 'REGIONAL_COMMAND' } }, orderBy: { name: 'asc' }, select: { name: true, path: true } }),
    ]);
    const sc = req.scope!; // commands the caller works in or above
    const visible = commands.filter((c) => sc.all || sc.paths.some((p) => c.path.startsWith(p) || p.startsWith(c.path)));
    const items = rows.map((r) => {
      const up: Record<string, string> = {};
      for (let u: any = r.orgUnit.parent; u; u = u.parent) up[u.type.code] = u.name;
      return { id: r.id, code: r.code, name: r.name, town: r.town, type: r.facilityType.name, district: up.DISTRICT ?? null, division: up.DIVISION ?? null, command: up.REGIONAL_COMMAND ?? null,
        status: r.orgUnit.verificationStatus, source: r.orgUnit.sourceRef, mapped: r.coordPrecision, inCustody: r._count.policeCustody };
    });
    return { ...page(items, total, q), commands: visible };
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
