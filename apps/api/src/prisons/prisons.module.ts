import { Controller, ForbiddenException, Get, Module, NotFoundException, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AccessScope, AuthedRequest, inScope, unitWhere } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';
import { PrisonCustodyController } from './custody.controller';
import { PrisonPostingsController } from './postings.controller';
import { lastMonths, monthStart, rollupBuckets, sumBy, tally } from '../common/reports';

const PRISONS = { institution: { code: 'PRISONS' as const } };
const facilityScope = (scope: AccessScope) => ({ facility: { ...PRISONS, orgUnit: unitWhere(scope) } });
const HELD = { in: ['IN_CUSTODY', 'IN_TRANSIT'] as ('IN_CUSTODY' | 'IN_TRANSIT')[] };

@ApiTags('prisons')
@Controller('prisons')
export class PrisonsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get('dashboard')
  @RequirePermission('prisons.dashboard.read')
  async dashboard(@Req() req: AuthedRequest) {
    const fs = facilityScope(req.scope!); const d30 = new Date(Date.now() - 30 * 86400_000);
    const [population, remand, convicted, admissions30d, releases30d, personnel, facilities] = await Promise.all([
      this.prisma.prisonCustodyEpisode.count({ where: { ...fs, status: HELD } }),
      this.prisma.prisonCustodyEpisode.count({ where: { ...fs, status: HELD, classification: 'REMAND' } }),
      this.prisma.prisonCustodyEpisode.count({ where: { ...fs, status: HELD, classification: 'CONVICTED' } }),
      this.prisma.prisonAdmission.count({ where: { ...fs, admittedAt: { gte: d30 } } }),
      this.prisma.prisonRelease.count({ where: { ...fs, status: 'COMPLETED', releasedAt: { gte: d30 } } }),
      this.prisma.prisonPersonnel.count({ where: { currentOrgUnit: unitWhere(req.scope!), status: 'ACTIVE' } }),
      this.occupancy(req.scope!),
    ]);
    const capacity = facilities.reduce((n, f) => n + (f.capacity ?? 0), 0);
    return { scope: req.scope!.all ? 'ALL' : 'JURISDICTION', population, remand, convicted, admissions30d, releases30d, personnel,
      capacity, occupancyRate: capacity ? Math.round((population / capacity) * 100) : null, facilities };
  }

  private async occupancy(scope: AccessScope) {
    const rows = await this.prisma.facility.findMany({ where: { ...PRISONS, orgUnit: unitWhere(scope) }, orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, capacity: true, functions: true, operationalStatus: true, isSynthetic: true, facilityType: { select: { name: true } },
        housingUnits: { select: { id: true, name: true, capacity: true }, orderBy: { code: 'asc' } }, orgUnit: { select: { parent: { select: { name: true } } } }, _count: { select: { prisonCustody: { where: { status: HELD } } } } } });
    return rows.map((f) => ({ id: f.id, code: f.code, name: f.name, type: f.facilityType.name, regionalCommand: f.orgUnit.parent?.name ?? null, capacity: f.capacity,
      functions: f.functions, housingUnits: f.housingUnits, operationalStatus: f.operationalStatus, isSynthetic: f.isSynthetic, population: f._count.prisonCustody,
      occupancyRate: f.capacity ? Math.round((f._count.prisonCustody / f.capacity) * 100) : null }));
  }

  /** Roll-up by regional command (or own establishment) plus six-month admissions and releases. Aggregates only. */
  @Get('reports')
  @RequirePermission('prisons.dashboard.read')
  async reports(@Req() req: AuthedRequest) {
    const buckets = await rollupBuckets(this.prisma, req.scope!, 'PRISONS');
    const ids = buckets.flatMap((b) => b.facilityIds); const d30 = new Date(Date.now() - 30 * 86400_000); const months = lastMonths(6);
    const [held, remand, convicted, adm30, rel30, trIn30, trOut30, caps, admissions, releases] = await Promise.all([
      this.prisma.prisonCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: HELD }, _count: { _all: true } }),
      this.prisma.prisonCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: HELD, classification: 'REMAND' }, _count: { _all: true } }),
      this.prisma.prisonCustodyEpisode.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: HELD, classification: 'CONVICTED' }, _count: { _all: true } }),
      this.prisma.prisonAdmission.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, admittedAt: { gte: d30 } }, _count: { _all: true } }),
      this.prisma.prisonRelease.groupBy({ by: ['facilityId'], where: { facilityId: { in: ids }, status: 'COMPLETED', releasedAt: { gte: d30 } }, _count: { _all: true } }),
      this.prisma.prisonTransfer.groupBy({ by: ['toFacilityId'], where: { toFacilityId: { in: ids }, status: 'RECEIVED', receivedAt: { gte: d30 } }, _count: { _all: true } }),
      this.prisma.prisonTransfer.groupBy({ by: ['fromFacilityId'], where: { fromFacilityId: { in: ids }, status: { in: ['IN_TRANSIT', 'RECEIVED'] }, dispatchedAt: { gte: d30 } }, _count: { _all: true } }),
      this.prisma.facility.findMany({ where: { id: { in: ids } }, select: { id: true, capacity: true } }),
      this.prisma.prisonAdmission.findMany({ where: { facilityId: { in: ids }, admittedAt: { gte: monthStart(months[0]) } }, select: { admittedAt: true } }),
      this.prisma.prisonRelease.findMany({ where: { facilityId: { in: ids }, status: 'COMPLETED', releasedAt: { gte: monthStart(months[0]) } }, select: { releasedAt: true } }),
    ]);
    const asFac = (rows: any[], key: string) => rows.map((r) => ({ facilityId: r[key], _count: r._count }));
    const rows = buckets.map((b) => {
      const capacity = caps.filter((c) => b.facilityIds.includes(c.id)).reduce((n, c) => n + (c.capacity ?? 0), 0); const population = sumBy(held, b.facilityIds);
      return { id: b.id, name: b.name, establishments: b.facilityIds.length, capacity, population, occupancyRate: capacity ? Math.round((population / capacity) * 100) : null,
        remand: sumBy(remand, b.facilityIds), convicted: sumBy(convicted, b.facilityIds), admissions30d: sumBy(adm30, b.facilityIds), releases30d: sumBy(rel30, b.facilityIds),
        transfersIn30d: sumBy(asFac(trIn30, 'toFacilityId'), b.facilityIds), transfersOut30d: sumBy(asFac(trOut30, 'fromFacilityId'), b.facilityIds) };
    });
    const keys = ['establishments', 'capacity', 'population', 'remand', 'convicted', 'admissions30d', 'releases30d', 'transfersIn30d', 'transfersOut30d'] as const;
    const total: Record<string, number | null> = Object.fromEntries(keys.map((k) => [k, rows.reduce((n, r) => n + r[k], 0)]));
    total.occupancyRate = total.capacity ? Math.round(((total.population as number) / (total.capacity as number)) * 100) : null;
    return { generatedAt: new Date(), rows, total, byMonth: months.map((m, i) => ({ month: m, admissions: tally(admissions.map((a) => a.admittedAt), months)[i].count,
      releases: tally(releases.map((r) => r.releasedAt!).filter(Boolean), months)[i].count })) };
  }

  @Get('facilities')
  @RequirePermission('prisons.facility.read')
  facilities(@Req() req: AuthedRequest) { return this.occupancy(req.scope!); }

  @Get('prisoners')
  @RequirePermission('prisons.prisoner.read')
  async prisoners(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { ...facilityScope(req.scope!), ...(q.status ? { status: q.status as never } : { status: HELD }),
      ...(q.q ? { prisonerRecord: { OR: [{ prisonerNumber: { contains: q.q, mode: 'insensitive' as const } }, { person: { surname: { contains: q.q, mode: 'insensitive' as const } } }, { person: { otherNames: { contains: q.q, mode: 'insensitive' as const } } }] } } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.prisonCustodyEpisode.findMany({ where, orderBy: { startedAt: 'desc' }, ...paging(q),
        select: { id: true, status: true, classification: true, startedAt: true, endedAt: true, facility: { select: { id: true, name: true } }, housingUnit: { select: { name: true } },
          prisonerRecord: { select: { id: true, prisonerNumber: true, person: { select: { indexNumber: true, surname: true, otherNames: true, sex: true } } } } } }),
      this.prisma.prisonCustodyEpisode.count({ where }),
    ]);
    return page(items, total, q);
  }

  @Get('prisoners/:episodeId')
  @RequirePermission('prisons.prisoner.read')
  async prisoner(@Req() req: AuthedRequest, @Param('episodeId', ParseUUIDPipe) id: string) {
    const ep = await this.prisma.prisonCustodyEpisode.findUnique({ where: { id },
      include: { facility: { include: { orgUnit: true, housingUnits: { orderBy: { code: 'asc' } }, rehabProgrammes: { where: { active: true }, orderBy: { name: 'asc' } } } }, housingUnit: true, admission: { include: { courtOrder: true, facility: { select: { name: true } } } }, transfers: { include: { fromFacility: { select: { name: true } }, toFacility: { select: { name: true } } } }, release: true,
        prisonerRecord: { include: { person: true, sentences: true, enrollments: { include: { programme: true } } } } } });
    if (!ep) throw new NotFoundException();
    if (!inScope(req.scope!, ep.facility.orgUnit.path)) {
      await this.audit.record(req, { action: 'access.denied', outcome: 'DENIED', permission: 'prisons.prisoner.read', entityType: 'prison_custody_episode', entityId: id, detail: { reason: 'outside_jurisdiction' } });
      throw new ForbiddenException('This record is outside your jurisdiction');
    }
    await this.audit.record(req, { action: 'prisons.prisoner.view', outcome: 'SUCCESS', entityType: 'prison_custody_episode', entityId: id });
    return ep;
  }

  @Get('personnel')
  @RequirePermission('prisons.personnel.read')
  async personnel(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { currentOrgUnit: unitWhere(req.scope!),
      ...(q.q ? { OR: [{ surname: { contains: q.q, mode: 'insensitive' as const } }, { otherNames: { contains: q.q, mode: 'insensitive' as const } }, { serviceNumber: { contains: q.q, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.prisonPersonnel.findMany({ where, orderBy: [{ currentRank: { seniorityOrder: 'asc' } }, { surname: 'asc' }], ...paging(q),
        select: { id: true, serviceNumber: true, surname: true, otherNames: true, status: true,
          currentRank: { select: { name: true, abbreviation: true } }, currentOrgUnit: { select: { name: true, type: { select: { name: true } } } },
          commands: { where: { effectiveTo: null }, select: { acting: true, appointment: { select: { title: true } } } } } }),
      this.prisma.prisonPersonnel.count({ where }),
    ]);
    return page(items, total, q);
  }
}

@Module({ controllers: [PrisonsController, PrisonCustodyController, PrisonPostingsController] })
export class PrisonsModule {}
