import { BadRequestException, Body, ConflictException, Controller, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { assertDifferentActor, assertInScope } from '../common/guards';
import { nextRef } from '../common/refs';

/** Configurable rule (hours) for production before a court. Default reflects Constitution art. 14(3); practice to be confirmed. */
const deadlineHours = () => Number(process.env.CUSTODY_COURT_DEADLINE_HOURS ?? 48);
const notFuture = (iso: string, label: string) => { if (new Date(iso).getTime() > Date.now() + 5 * 60_000) throw new BadRequestException(`${label} cannot be in the future`); return new Date(iso); };

const ARREST_BASIS = ['WARRANT', 'WITHOUT_WARRANT_S10', 'PRIVATE_PERSON_S12'] as const;
const ageAt = (dob: Date, at: Date) => { let a = at.getUTCFullYear() - dob.getUTCFullYear(); const m = at.getUTCMonth() - dob.getUTCMonth(); if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) a--; return a; };

class RegisterArrestDto {
  @ApiProperty() @IsUUID() personId: string;
  @ApiProperty() @IsUUID() facilityId: string;
  @ApiProperty() @IsDateString() arrestedAt: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) suspectedOffence: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) legalAuthority: string;
  @ApiProperty({ enum: ARREST_BASIS, description: 'Act 30: arrest under warrant, without warrant (s.10) or by a private person (s.12)' })
  @IsIn(ARREST_BASIS as unknown as string[]) arrestBasis: (typeof ARREST_BASIS)[number];
  @ApiPropertyOptional({ description: 'Required when arrestBasis is WARRANT' }) @IsOptional() @IsString() @MaxLength(80) warrantRef?: string;
  @ApiProperty({ description: 'When the person was told the reasons for arrest (Constitution art. 14(2))' }) @IsDateString() reasonsGivenAt: string;
  @ApiProperty({ description: 'When the person was told of the right to a lawyer of their choice (art. 14(2))' }) @IsDateString() rightToLawyerGivenAt: string;
  @ApiProperty({ description: 'Language in which the information was given' }) @IsString() @MinLength(2) @MaxLength(60) languageUsed: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lawyerRequested?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() caseId?: string;
  @ApiProperty({ description: 'Open a custody episode only when the person is actually detained' }) @IsBoolean() detain: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) cellRef?: string;
}
class MovementDto {
  @ApiProperty() @IsIn(['CELL_ASSIGNMENT', 'STATION_TRANSFER', 'COURT_APPEARANCE', 'MEDICAL', 'RETURN']) type: 'CELL_ASSIGNMENT' | 'STATION_TRANSFER' | 'COURT_APPEARANCE' | 'MEDICAL' | 'RETURN';
  @ApiPropertyOptional() @IsOptional() @IsUUID() toFacilityId?: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) note: string;
}
const DISPOSITIONS = ['RELEASED_ON_BAIL', 'TRANSFERRED_TO_COURT', 'REMANDED_TO_PRISON', 'RELEASED_NO_CHARGE', 'CLOSED_OTHER'] as const;
class SuretyDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(120) name: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(60) idRef: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) address: string;
}
/** Police enquiry bail is a bond (Act 30 s.15(2)), taken by the officer in charge of the station (s.97). */
class BailBondDto {
  @ApiProperty({ description: 'Bond amount in Ghana cedis' }) @IsInt() @Min(0) @Max(100_000_000) amountGhs: number;
  @ApiProperty({ type: [SuretyDto] }) @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => SuretyDto) sureties: SuretyDto[];
  @ApiProperty({ enum: ['COURT', 'POLICE_STATION'] }) @IsIn(['COURT', 'POLICE_STATION']) reportTo: 'COURT' | 'POLICE_STATION';
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) reportPlace: string;
  @ApiProperty() @IsDateString() reportAt: string;
  @ApiPropertyOptional({ description: 'Cash deposit in lieu of a bond (s.99), Ghana cedis' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000) depositInLieuGhs?: number;
}
class JuvenileNoticeDto {
  @ApiProperty() @IsDateString() parentGuardianNotifiedAt: string;
}
class CloseDto {
  @ApiProperty({ enum: DISPOSITIONS }) @IsIn(DISPOSITIONS as unknown as string[]) disposition: (typeof DISPOSITIONS)[number];
  @ApiProperty({ description: 'Legal basis and particulars of the disposition, as decided by the authorizing officer' }) @IsString() @MinLength(5) @MaxLength(1000) dispositionNote: string;
  @ApiPropertyOptional({ type: BailBondDto, description: 'Required when the disposition is RELEASED_ON_BAIL' }) @IsOptional() @ValidateNested() @Type(() => BailBondDto) bailBond?: BailBondDto;
}

@ApiTags('police')
@Controller('police')
export class PoliceCustodyController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Workflow A, steps 1–5: register an arrest and, if the person is detained, open the custody episode. */
  @Post('arrests')
  @RequirePermission('police.custody.write')
  async registerArrest(@Req() req: AuthedRequest, @Body() dto: RegisterArrestDto) {
    const facility = await this.prisma.facility.findFirst({ where: { id: dto.facilityId, institution: { code: 'POLICE' } }, include: { orgUnit: true } });
    if (!facility) throw new BadRequestException('Unknown police station');
    await assertInScope(this.audit, req, req.scope!, facility.orgUnit.path, 'facility', facility.id);
    const person = await this.prisma.person.findUnique({ where: { id: dto.personId } });
    if (!person) throw new BadRequestException('Unknown person: search or register the identity record first');
    if (dto.arrestBasis === 'WARRANT' && !dto.warrantRef?.trim()) throw new BadRequestException('Enter the warrant reference for an arrest under warrant');
    if (dto.caseId) {
      const c = await this.prisma.policeCase.findUnique({ where: { id: dto.caseId }, include: { facility: { include: { orgUnit: true } } } });
      if (!c) throw new BadRequestException('Unknown case');
      await assertInScope(this.audit, req, req.scope!, c.facility.orgUnit.path, 'police_case', c.id);
    }
    const at = notFuture(dto.arrestedAt, 'Arrest time');
    const reasonsAt = notFuture(dto.reasonsGivenAt, 'Time reasons were given'); const lawyerAt = notFuture(dto.rightToLawyerGivenAt, 'Time the right to a lawyer was given');
    if (reasonsAt < at || lawyerAt < at) throw new BadRequestException('Rights information cannot be recorded as given before the arrest');
    const juvenile = !!person.dateOfBirth && ageAt(person.dateOfBirth, at) < 18;
    if (dto.detain && (await this.prisma.policeCustodyEpisode.count({ where: { personId: dto.personId, status: 'IN_CUSTODY' } })))
      throw new ConflictException('This person already has an open police custody episode');
    const me = req.auth!.user.id;
    const result = await this.prisma.$transaction(async (tx) => {
      const arrest = await tx.arrest.create({ data: { reference: await nextRef(tx, 'arrest', 'ARR'), personId: dto.personId, facilityId: facility.id, caseId: dto.caseId, arrestedAt: at,
        location: dto.location, suspectedOffence: dto.suspectedOffence, legalAuthority: dto.legalAuthority, recordedById: me,
        arrestBasis: dto.arrestBasis, warrantRef: dto.warrantRef?.trim() || null, reasonsGivenAt: reasonsAt, rightToLawyerGivenAt: lawyerAt, languageUsed: dto.languageUsed, lawyerRequested: !!dto.lawyerRequested } });
      if (!dto.detain) return { arrest, custody: null };
      const custody = await tx.policeCustodyEpisode.create({ data: { reference: await nextRef(tx, 'custody', 'CUS'), personId: dto.personId, arrestId: arrest.id, facilityId: facility.id,
        // The 48-hour clock runs from ARREST, in calendar hours including weekends and holidays (art. 14(3); Act 30 s.15(1))
        detainedAt: at, courtDeadlineAt: new Date(at.getTime() + deadlineHours() * 3600_000), legalAuthority: dto.legalAuthority, cellRef: dto.cellRef, openedById: me,
        isJuvenile: juvenile, juvenileDetentionOrderDueAt: juvenile ? new Date(at.getTime() + 48 * 3600_000) : null,
        movements: { create: { type: 'CELL_ASSIGNMENT', toFacilityId: facility.id, occurredAt: at, note: dto.cellRef ? `Placed in ${dto.cellRef}` : 'Placed in cells', recordedById: me } } } });
      return { arrest, custody };
    });
    await this.audit.record(req, { action: 'police.arrest.register', outcome: 'SUCCESS', entityType: 'arrest', entityId: result.arrest.id, detail: { detained: dto.detain, custodyId: result.custody?.id, juvenile } });
    return result;
  }

  private async episode(req: AuthedRequest, id: string) {
    const ep = await this.prisma.policeCustodyEpisode.findUnique({ where: { id }, include: { facility: { include: { orgUnit: true } } } });
    if (!ep) throw new NotFoundException();
    await assertInScope(this.audit, req, req.scope!, ep.facility.orgUnit.path, 'police_custody_episode', id);
    return ep;
  }

  /** Step 7: document a movement. Append-only; a station transfer also moves the episode to the receiving station. */
  @Post('custody/:id/movements')
  @RequirePermission('police.custody.write')
  async addMovement(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MovementDto) {
    const ep = await this.episode(req, id);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('This custody episode is closed');
    let toFacilityId: string | undefined;
    if (dto.type === 'STATION_TRANSFER') {
      const to = await this.prisma.facility.findFirst({ where: { id: dto.toFacilityId ?? '', institution: { code: 'POLICE' } } });
      if (!to || to.id === ep.facilityId) throw new BadRequestException('Select a different police station to transfer to');
      toFacilityId = to.id;
    }
    const me = req.auth!.user.id;
    const [movement] = await this.prisma.$transaction([
      this.prisma.custodyMovement.create({ data: { episodeId: id, type: dto.type, fromFacilityId: ep.facilityId, toFacilityId: toFacilityId ?? ep.facilityId, occurredAt: new Date(), note: dto.note, recordedById: me } }),
      ...(toFacilityId ? [this.prisma.policeCustodyEpisode.update({ where: { id }, data: { facilityId: toFacilityId } })] : []),
    ]);
    await this.audit.record(req, { action: 'police.custody.movement', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id, detail: { type: dto.type, toFacilityId } });
    return movement;
  }

  /** Juveniles: record when the parent or guardian was informed (Act 653; practice to confirm). */
  @Post('custody/:id/juvenile-notice')
  @RequirePermission('police.custody.write')
  async juvenileNotice(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: JuvenileNoticeDto) {
    const ep = await this.episode(req, id);
    if (!ep.isJuvenile) throw new BadRequestException('This custody episode is not flagged as a juvenile');
    const at = notFuture(dto.parentGuardianNotifiedAt, 'Notification time');
    const updated = await this.prisma.policeCustodyEpisode.update({ where: { id }, data: { parentGuardianNotifiedAt: at } });
    await this.audit.record(req, { action: 'police.custody.juvenile_notice', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id });
    return updated;
  }

  /** Step 6: supervisor review of the custody record. */
  @Post('custody/:id/review')
  @RequirePermission('police.custody.close')
  async review(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const ep = await this.episode(req, id);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('This custody episode is closed');
    await assertDifferentActor(this.audit, req, ep.openedById, 'police.custody.review', 'police_custody_episode', id);
    const updated = await this.prisma.policeCustodyEpisode.update({ where: { id }, data: { reviewedById: req.auth!.user.id, reviewedAt: new Date() } });
    await this.audit.record(req, { action: 'police.custody.review', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id });
    return updated;
  }

  /**
   * Step 8: close the episode with a disposition decided and authorized by a named officer.
   * The system records the decision; it does not make it.
   */
  @Post('custody/:id/close')
  @RequirePermission('police.custody.close')
  async close(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseDto) {
    const ep = await this.episode(req, id);
    if (ep.status !== 'IN_CUSTODY') throw new ConflictException('This custody episode is already closed');
    await assertDifferentActor(this.audit, req, ep.openedById, 'police.custody.close', 'police_custody_episode', id);
    if (dto.disposition === 'RELEASED_ON_BAIL' && !dto.bailBond) throw new BadRequestException('Police enquiry bail must be recorded as a bond: amount, sureties, where and when to report (Act 30 s.15(2))');
    const me = req.auth!.user.id; const now = new Date();
    const b = dto.disposition === 'RELEASED_ON_BAIL' ? dto.bailBond! : null;
    if (b && new Date(b.reportAt) <= now) throw new BadRequestException('The report-back date must be in the future');
    const [updated] = await this.prisma.$transaction([
      this.prisma.policeCustodyEpisode.update({ where: { id }, data: { status: dto.disposition, closedAt: now, closedById: me, dispositionAuthorizedById: me, dispositionNote: dto.dispositionNote } }),
      ...(b ? [this.prisma.policeBailBond.create({ data: { episodeId: id, amountGhs: b.amountGhs, sureties: b.sureties as never, reportTo: b.reportTo, reportPlace: b.reportPlace,
        reportAt: new Date(b.reportAt), depositInLieuGhs: b.depositInLieuGhs, grantedById: me } })] : []),
    ]);
    await this.audit.record(req, { action: 'police.custody.close', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id, detail: { disposition: dto.disposition } });
    return updated;
  }
}
