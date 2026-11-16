import { BadRequestException, Body, ConflictException, Controller, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { assertDifferentActor, assertInScope } from '../common/guards';
import { nextRef } from '../common/refs';

/** Configurable rule (hours) for production before a court. Default reflects Constitution art. 14(3); practice to be confirmed. */
const deadlineHours = () => Number(process.env.CUSTODY_COURT_DEADLINE_HOURS ?? 48);
const notFuture = (iso: string, label: string) => { if (new Date(iso).getTime() > Date.now() + 5 * 60_000) throw new BadRequestException(`${label} cannot be in the future`); return new Date(iso); };

class RegisterArrestDto {
  @ApiProperty() @IsUUID() personId: string;
  @ApiProperty() @IsUUID() facilityId: string;
  @ApiProperty() @IsDateString() arrestedAt: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) suspectedOffence: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) legalAuthority: string;
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
class CloseDto {
  @ApiProperty({ enum: DISPOSITIONS }) @IsIn(DISPOSITIONS as unknown as string[]) disposition: (typeof DISPOSITIONS)[number];
  @ApiProperty({ description: 'Legal basis and particulars of the disposition, as decided by the authorizing officer' }) @IsString() @MinLength(5) @MaxLength(1000) dispositionNote: string;
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
    if (!(await this.prisma.person.findUnique({ where: { id: dto.personId } }))) throw new BadRequestException('Unknown person: search or register the identity record first');
    if (dto.caseId) {
      const c = await this.prisma.policeCase.findUnique({ where: { id: dto.caseId }, include: { facility: { include: { orgUnit: true } } } });
      if (!c) throw new BadRequestException('Unknown case');
      await assertInScope(this.audit, req, req.scope!, c.facility.orgUnit.path, 'police_case', c.id);
    }
    const at = notFuture(dto.arrestedAt, 'Arrest time');
    if (dto.detain && (await this.prisma.policeCustodyEpisode.count({ where: { personId: dto.personId, status: 'IN_CUSTODY' } })))
      throw new ConflictException('This person already has an open police custody episode');
    const me = req.auth!.user.id;
    const result = await this.prisma.$transaction(async (tx) => {
      const arrest = await tx.arrest.create({ data: { reference: await nextRef(tx, 'arrest', 'ARR'), personId: dto.personId, facilityId: facility.id, caseId: dto.caseId, arrestedAt: at,
        location: dto.location, suspectedOffence: dto.suspectedOffence, legalAuthority: dto.legalAuthority, recordedById: me } });
      if (!dto.detain) return { arrest, custody: null };
      const custody = await tx.policeCustodyEpisode.create({ data: { reference: await nextRef(tx, 'custody', 'CUS'), personId: dto.personId, arrestId: arrest.id, facilityId: facility.id,
        detainedAt: at, courtDeadlineAt: new Date(at.getTime() + deadlineHours() * 3600_000), legalAuthority: dto.legalAuthority, cellRef: dto.cellRef, openedById: me,
        movements: { create: { type: 'CELL_ASSIGNMENT', toFacilityId: facility.id, occurredAt: at, note: dto.cellRef ? `Placed in ${dto.cellRef}` : 'Placed in cells', recordedById: me } } } });
      return { arrest, custody };
    });
    await this.audit.record(req, { action: 'police.arrest.register', outcome: 'SUCCESS', entityType: 'arrest', entityId: result.arrest.id, detail: { detained: dto.detain, custodyId: result.custody?.id } });
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
    const me = req.auth!.user.id; const now = new Date();
    const updated = await this.prisma.policeCustodyEpisode.update({ where: { id }, data: { status: dto.disposition, closedAt: now, closedById: me, dispositionAuthorizedById: me, dispositionNote: dto.dispositionNote } });
    await this.audit.record(req, { action: 'police.custody.close', outcome: 'SUCCESS', entityType: 'police_custody_episode', entityId: id, detail: { disposition: dto.disposition } });
    return updated;
  }
}
