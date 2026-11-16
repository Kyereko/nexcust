import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest, unitWhere } from '../common/access';
import { assertDifferentActor, assertInScope } from '../common/guards';
import { ListQuery, page, paging } from '../common/pagination';
import { nextRef } from '../common/refs';

const PRISONS = { institution: { code: 'PRISONS' as const } };
const WARRANTS = ['REMAND_WARRANT', 'COMMITTAL_WARRANT'] as const;
const RELEASE_TYPES = ['SENTENCE_SERVED', 'BAIL', 'COURT_ORDER', 'ACQUITTAL', 'PARDON_OR_AMNESTY', 'FINE_PAID', 'OTHER'] as const;

class AdmitDto {
  @ApiProperty() @IsUUID() personId: string;
  @ApiProperty() @IsUUID() facilityId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() housingUnitId?: string;
  @ApiProperty({ enum: WARRANTS, description: 'Legal authority for custody, entered from the court document' }) @IsIn(WARRANTS as unknown as string[]) warrantType: (typeof WARRANTS)[number];
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(120) court: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(60) warrantRef: string;
  @ApiProperty() @IsDateString() warrantIssuedAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() returnDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) offence?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) sentenceText?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1200) termMonths?: number;
  @ApiPropertyOptional({ description: 'Entered from the warrant. The system does not compute release dates.' }) @IsOptional() @IsDateString() latestReleaseDate?: string;
}
class TransferDto {
  @ApiProperty() @IsUUID() episodeId: string;
  @ApiProperty() @IsUUID() toFacilityId: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(500) reason: string;
}
class ReleaseDto {
  @ApiProperty() @IsUUID() episodeId: string;
  @ApiProperty({ enum: RELEASE_TYPES }) @IsIn(RELEASE_TYPES as unknown as string[]) type: (typeof RELEASE_TYPES)[number];
  @ApiProperty({ description: 'The legal authority for release, as verified by the initiating officer' }) @IsString() @MinLength(5) @MaxLength(500) legalAuthority: string;
}
class ReasonDto { @ApiProperty() @IsString() @MinLength(5) @MaxLength(500) reason: string; }
class EnrollDto {
  @ApiProperty() @IsUUID() episodeId: string;
  @ApiProperty() @IsUUID() programmeId: string;
}
class HousingDto { @ApiProperty() @IsUUID() housingUnitId: string; }

const transferInclude = { fromFacility: { select: { id: true, name: true, orgUnit: { select: { path: true } } } }, toFacility: { select: { id: true, name: true, orgUnit: { select: { path: true } } } },
  episode: { select: { id: true, status: true, prisonerRecord: { select: { prisonerNumber: true, person: { select: { surname: true, otherNames: true } } } } } } };
const strip = <T extends { fromFacility?: any; toFacility?: any; facility?: any }>(r: T) => {
  const f = (x: any) => x && { id: x.id, name: x.name };
  return { ...r, ...(r.fromFacility ? { fromFacility: f(r.fromFacility) } : {}), ...(r.toFacility ? { toFacility: f(r.toFacility) } : {}), ...(r.facility ? { facility: f(r.facility) } : {}) };
};

/**
 * Workflows D and E. Every custody event rests on a recorded legal authority and a named officer.
 * The system records decisions; it never determines detention, sentence or release.
 */
@ApiTags('prisons')
@Controller('prisons')
export class PrisonCustodyController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Establishments a transfer may target (whole service). */
  @Get('establishments')
  @RequirePermission('prisons.facility.read')
  establishments() {
    return this.prisma.facility.findMany({ where: PRISONS, orderBy: { name: 'asc' }, select: { id: true, name: true, facilityType: { select: { name: true } } } });
  }

  // ───────── Workflow D: admission ─────────
  @Post('admissions')
  @RequirePermission('prisons.prisoner.write')
  async admit(@Req() req: AuthedRequest, @Body() dto: AdmitDto) {
    const facility = await this.prisma.facility.findFirst({ where: { id: dto.facilityId, ...PRISONS }, include: { orgUnit: true, housingUnits: true } });
    if (!facility) throw new BadRequestException('Unknown prison establishment');
    await assertInScope(this.audit, req, req.scope!, facility.orgUnit.path, 'facility', facility.id);
    if (dto.housingUnitId && !facility.housingUnits.some((h) => h.id === dto.housingUnitId)) throw new BadRequestException('Housing unit does not belong to this establishment');
    if (!(await this.prisma.person.findUnique({ where: { id: dto.personId } }))) throw new BadRequestException('Unknown person: search or register the identity record first');
    const issued = new Date(dto.warrantIssuedAt);
    if (issued.getTime() > Date.now() + 86400_000) throw new BadRequestException('Warrant date cannot be in the future');
    const convicted = dto.warrantType === 'COMMITTAL_WARRANT';
    if (convicted && (!dto.offence || !dto.sentenceText)) throw new BadRequestException('A committal warrant requires the offence and the sentence as stated on the warrant');
    const existing = await this.prisma.prisonerRecord.findUnique({ where: { personId: dto.personId } });
    if (existing && (await this.prisma.prisonCustodyEpisode.count({ where: { prisonerRecordId: existing.id, status: { in: ['IN_CUSTODY', 'IN_TRANSIT'] } } })))
      throw new ConflictException('This person is already held in prison custody');
    const me = req.auth!.user.id; const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const record = existing ?? (await tx.prisonerRecord.create({ data: { prisonerNumber: await nextRef(tx, 'prison', 'PN'), personId: dto.personId } }));
      const order = await tx.courtOrder.create({ data: { personId: dto.personId, type: dto.warrantType, court: dto.court, orderRef: dto.warrantRef, issuedAt: issued,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : null, verifiedById: me, verifiedAt: now } });
      const classification = convicted ? 'CONVICTED' as const : 'REMAND' as const;
      const admission = await tx.prisonAdmission.create({ data: { reference: await nextRef(tx, 'prison', 'ADM'), prisonerRecordId: record.id, facilityId: facility.id, courtOrderId: order.id,
        classification, admittedAt: now, identityCheckedById: me, recordedById: me } });
      const episode = await tx.prisonCustodyEpisode.create({ data: { prisonerRecordId: record.id, admissionId: admission.id, facilityId: facility.id, housingUnitId: dto.housingUnitId, classification, startedAt: now } });
      if (convicted) await tx.sentenceRecord.create({ data: { prisonerRecordId: record.id, courtOrderId: order.id, offence: dto.offence!, sentenceText: dto.sentenceText!, termMonths: dto.termMonths,
        sentencedAt: issued, latestReleaseDate: dto.latestReleaseDate ? new Date(dto.latestReleaseDate) : null, recordedById: me } });
      return { prisonerRecord: record, admission, episode };
    });
    await this.audit.record(req, { action: 'prisons.admission.create', outcome: 'SUCCESS', entityType: 'prison_custody_episode', entityId: result.episode.id, detail: { warrantType: dto.warrantType, warrantRef: dto.warrantRef } });
    return result;
  }

  private async episode(req: AuthedRequest, id: string) {
    const ep = await this.prisma.prisonCustodyEpisode.findUnique({ where: { id }, include: { facility: { include: { orgUnit: true, housingUnits: true } } } });
    if (!ep) throw new NotFoundException('Unknown custody episode');
    await assertInScope(this.audit, req, req.scope!, ep.facility.orgUnit.path, 'prison_custody_episode', id);
    return ep;
  }
  private async assertNothingPending(episodeId: string) {
    if (await this.prisma.prisonTransfer.count({ where: { episodeId, status: { in: ['INITIATED', 'APPROVED', 'IN_TRANSIT'] } } })) throw new ConflictException('A transfer is already in progress for this prisoner');
    if (await this.prisma.prisonRelease.count({ where: { episodeId, status: { in: ['INITIATED', 'APPROVED'] } } })) throw new ConflictException('A release is already awaiting authorization for this prisoner');
  }

  @Post('prisoners/:episodeId/housing')
  @RequirePermission('prisons.prisoner.write')
  async assignHousing(@Req() req: AuthedRequest, @Param('episodeId', ParseUUIDPipe) id: string, @Body() dto: HousingDto) {
    const ep = await this.episode(req, id);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('Prisoner is not currently held at this establishment');
    if (!ep.facility.housingUnits.some((h) => h.id === dto.housingUnitId)) throw new BadRequestException('Housing unit does not belong to this establishment');
    const updated = await this.prisma.prisonCustodyEpisode.update({ where: { id }, data: { housingUnitId: dto.housingUnitId } });
    await this.audit.record(req, { action: 'prisons.housing.assign', outcome: 'SUCCESS', entityType: 'prison_custody_episode', entityId: id });
    return updated;
  }

  // ───────── Workflow E: transfer ─────────
  @Get('transfers')
  @RequirePermission('prisons.prisoner.read')
  async transfers(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const uw = unitWhere(req.scope!);
    const where = { OR: [{ fromFacility: { orgUnit: uw } }, { toFacility: { orgUnit: uw } }], ...(q.status ? { status: q.status as never } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.prisonTransfer.findMany({ where, orderBy: { createdAt: 'desc' }, ...paging(q), include: transferInclude }),
      this.prisma.prisonTransfer.count({ where }),
    ]);
    return page(items.map(strip), total, q);
  }

  @Post('transfers')
  @RequirePermission('prisons.transfer.initiate')
  async initiateTransfer(@Req() req: AuthedRequest, @Body() dto: TransferDto) {
    const ep = await this.episode(req, dto.episodeId);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('Only a prisoner currently in custody can be transferred');
    const to = await this.prisma.facility.findFirst({ where: { id: dto.toFacilityId, ...PRISONS } });
    if (!to || to.id === ep.facilityId) throw new BadRequestException('Select a different prison establishment');
    await this.assertNothingPending(ep.id);
    const t = await this.prisma.prisonTransfer.create({ data: { reference: await nextRef(this.prisma, 'prison', 'TRF'), episodeId: ep.id, fromFacilityId: ep.facilityId, toFacilityId: to.id, reason: dto.reason, initiatedById: req.auth!.user.id } });
    await this.audit.record(req, { action: 'prisons.transfer.initiate', outcome: 'SUCCESS', entityType: 'prison_transfer', entityId: t.id });
    return t;
  }

  private async transfer(id: string) {
    const t = await this.prisma.prisonTransfer.findUnique({ where: { id }, include: transferInclude });
    if (!t) throw new NotFoundException();
    return t;
  }

  /** Approval by the sending establishment dispatches the prisoner: status becomes IN_TRANSIT. */
  @Post('transfers/:id/approve')
  @RequirePermission('prisons.transfer.approve')
  async approveTransfer(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const t = await this.transfer(id);
    await assertInScope(this.audit, req, req.scope!, t.fromFacility.orgUnit.path, 'prison_transfer', id);
    if (t.status !== 'INITIATED') throw new ConflictException(`Transfer is ${t.status}, not awaiting approval`);
    await assertDifferentActor(this.audit, req, t.initiatedById, 'prisons.transfer.approve', 'prison_transfer', id);
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.prisonTransfer.update({ where: { id }, data: { status: 'IN_TRANSIT', approvedById: req.auth!.user.id, approvedAt: now, dispatchedAt: now } }),
      this.prisma.prisonCustodyEpisode.update({ where: { id: t.episodeId }, data: { status: 'IN_TRANSIT', housingUnitId: null } }),
    ]);
    await this.audit.record(req, { action: 'prisons.transfer.approve', outcome: 'SUCCESS', entityType: 'prison_transfer', entityId: id });
    return updated;
  }

  @Post('transfers/:id/reject')
  @RequirePermission('prisons.transfer.approve')
  async rejectTransfer(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    const t = await this.transfer(id);
    await assertInScope(this.audit, req, req.scope!, t.fromFacility.orgUnit.path, 'prison_transfer', id);
    if (t.status !== 'INITIATED') throw new ConflictException(`Transfer is ${t.status} and can no longer be rejected`);
    const updated = await this.prisma.prisonTransfer.update({ where: { id }, data: { status: 'REJECTED', reason: `${t.reason} | Rejected: ${dto.reason}` } });
    await this.audit.record(req, { action: 'prisons.transfer.reject', outcome: 'SUCCESS', entityType: 'prison_transfer', entityId: id });
    return updated;
  }

  /** The receiving establishment confirms arrival; only then does the prisoner appear on its register. */
  @Post('transfers/:id/receive')
  @RequirePermission('prisons.prisoner.write')
  async receiveTransfer(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const t = await this.transfer(id);
    await assertInScope(this.audit, req, req.scope!, t.toFacility.orgUnit.path, 'prison_transfer', id);
    if (t.status !== 'IN_TRANSIT') throw new ConflictException(`Transfer is ${t.status}, not in transit`);
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.prisonTransfer.update({ where: { id }, data: { status: 'RECEIVED', receivedById: req.auth!.user.id, receivedAt: now } }),
      this.prisma.prisonCustodyEpisode.update({ where: { id: t.episodeId }, data: { status: 'IN_CUSTODY', facilityId: t.toFacilityId, housingUnitId: null } }),
    ]);
    await this.audit.record(req, { action: 'prisons.transfer.receive', outcome: 'SUCCESS', entityType: 'prison_transfer', entityId: id });
    return updated;
  }

  // ───────── Workflow E: release ─────────
  @Get('releases')
  @RequirePermission('prisons.prisoner.read')
  async releases(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const where = { facility: { orgUnit: unitWhere(req.scope!) }, ...(q.status ? { status: q.status as never } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.prisonRelease.findMany({ where, orderBy: { createdAt: 'desc' }, ...paging(q), include: { facility: { select: { id: true, name: true } },
        episode: { select: { id: true, prisonerRecord: { select: { prisonerNumber: true, person: { select: { surname: true, otherNames: true } } } } } } } }),
      this.prisma.prisonRelease.count({ where }),
    ]);
    return page(items, total, q);
  }

  @Post('releases')
  @RequirePermission('prisons.release.initiate')
  async initiateRelease(@Req() req: AuthedRequest, @Body() dto: ReleaseDto) {
    const ep = await this.episode(req, dto.episodeId);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('Only a prisoner currently in custody can be released');
    await this.assertNothingPending(ep.id);
    const data = { facilityId: ep.facilityId, type: dto.type, legalAuthority: dto.legalAuthority, status: 'INITIATED' as const, initiatedById: req.auth!.user.id, approvedById: null, approvedAt: null };
    const previous = await this.prisma.prisonRelease.findUnique({ where: { episodeId: ep.id } }); // a rejected request may be re-submitted
    const r = previous ? await this.prisma.prisonRelease.update({ where: { id: previous.id }, data })
      : await this.prisma.prisonRelease.create({ data: { ...data, reference: await nextRef(this.prisma, 'prison', 'REL'), episodeId: ep.id } });
    await this.audit.record(req, { action: 'prisons.release.initiate', outcome: 'SUCCESS', entityType: 'prison_release', entityId: r.id, detail: { type: dto.type } });
    return r;
  }

  private async release(req: AuthedRequest, id: string) {
    const r = await this.prisma.prisonRelease.findUnique({ where: { id }, include: { facility: { include: { orgUnit: true } } } });
    if (!r) throw new NotFoundException();
    await assertInScope(this.audit, req, req.scope!, r.facility.orgUnit.path, 'prison_release', id);
    if (r.status !== 'INITIATED') throw new ConflictException(`Release is ${r.status}, not awaiting authorization`);
    return r;
  }

  /** A second, authorized officer approves; the release is then completed and the custody episode closed. */
  @Post('releases/:id/approve')
  @RequirePermission('prisons.release.approve')
  async approveRelease(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const r = await this.release(req, id);
    await assertDifferentActor(this.audit, req, r.initiatedById, 'prisons.release.approve', 'prison_release', id);
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.prisonRelease.update({ where: { id }, data: { status: 'COMPLETED', approvedById: req.auth!.user.id, approvedAt: now, releasedAt: now } }),
      this.prisma.prisonCustodyEpisode.update({ where: { id: r.episodeId }, data: { status: 'RELEASED', endedAt: now, housingUnitId: null } }),
      this.prisma.rehabilitationEnrollment.updateMany({ where: { prisonerRecord: { episodes: { some: { id: r.episodeId } } }, status: 'ENROLLED' }, data: { status: 'WITHDRAWN' } }),
    ]);
    await this.audit.record(req, { action: 'prisons.release.approve', outcome: 'SUCCESS', entityType: 'prison_release', entityId: id, detail: { episodeId: r.episodeId } });
    return updated;
  }

  @Post('releases/:id/reject')
  @RequirePermission('prisons.release.approve')
  async rejectRelease(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReasonDto) {
    const r = await this.release(req, id);
    const updated = await this.prisma.prisonRelease.update({ where: { id }, data: { status: 'REJECTED', legalAuthority: `${r.legalAuthority} | Rejected: ${dto.reason}` } });
    await this.audit.record(req, { action: 'prisons.release.reject', outcome: 'SUCCESS', entityType: 'prison_release', entityId: id });
    return updated;
  }

  // ───────── Rehabilitation ─────────
  @Get('rehabilitation')
  @RequirePermission('prisons.rehab.read')
  programmes(@Req() req: AuthedRequest) {
    return this.prisma.rehabilitationProgramme.findMany({ where: { facility: { ...PRISONS, orgUnit: unitWhere(req.scope!) } }, orderBy: [{ facility: { name: 'asc' } }, { name: 'asc' }],
      select: { id: true, name: true, category: true, capacity: true, active: true, facility: { select: { id: true, name: true } }, _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } } });
  }

  @Post('rehabilitation/enrollments')
  @RequirePermission('prisons.rehab.write')
  async enroll(@Req() req: AuthedRequest, @Body() dto: EnrollDto) {
    const ep = await this.episode(req, dto.episodeId);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('Prisoner is not currently held at this establishment');
    const prog = await this.prisma.rehabilitationProgramme.findFirst({ where: { id: dto.programmeId, facilityId: ep.facilityId, active: true }, include: { _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } } });
    if (!prog) throw new BadRequestException('Programme is not offered at the prisoner\'s establishment');
    if (prog.capacity !== null && prog._count.enrollments >= prog.capacity) throw new ConflictException('Programme is at capacity');
    if (await this.prisma.rehabilitationEnrollment.count({ where: { programmeId: prog.id, prisonerRecordId: ep.prisonerRecordId, status: 'ENROLLED' } })) throw new ConflictException('Prisoner is already enrolled in this programme');
    const e = await this.prisma.rehabilitationEnrollment.create({ data: { programmeId: prog.id, prisonerRecordId: ep.prisonerRecordId } });
    await this.audit.record(req, { action: 'prisons.rehab.enroll', outcome: 'SUCCESS', entityType: 'rehabilitation_enrollment', entityId: e.id });
    return e;
  }
}
