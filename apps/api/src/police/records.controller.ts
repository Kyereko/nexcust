import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest, unitWhere } from '../common/access';
import { assertInScope } from '../common/guards';
import { nextRef } from '../common/refs';
import { ageAt, canSeeJuvenile } from '../common/juvenile';

const CASE_STATUSES = ['OPEN', 'UNDER_INVESTIGATION', 'FORWARDED_FOR_ADVICE', 'BEFORE_COURT', 'CLOSED'] as const;
class CreateCaseDto {
  @ApiProperty() @IsUUID() facilityId: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) offenceCategory: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(2000) incidentSummary: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() suspectPersonId?: string;
}
class UpdateCaseDto {
  @ApiProperty({ enum: CASE_STATUSES }) @IsIn(CASE_STATUSES as unknown as string[]) status: (typeof CASE_STATUSES)[number];
}

@ApiTags('police')
@Controller('police')
export class PoliceRecordsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /**
   * A person's police record. Arrests, charges and court-recorded convictions are returned as SEPARATE
   * lists: an arrest or charge is never presented as a conviction. Station-held records outside the
   * caller's command are counted, not shown.
   */
  @Get('persons/:id/record')
  @RequirePermission('police.case.read')
  async personRecord(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const person = await this.prisma.person.findUnique({ where: { id }, include: { identifiers: { select: { type: true, value: true, verified: true } } } });
    if (!person) throw new NotFoundException();
    const fs = { facility: { institution: { code: 'POLICE' as const }, orgUnit: unitWhere(req.scope!) } };
    const [arrests, custody, cases, convictions, arrestsTotal] = await Promise.all([
      this.prisma.arrest.findMany({ where: { personId: id, voidedAt: null, ...fs }, orderBy: { arrestedAt: 'desc' },
        select: { id: true, reference: true, arrestedAt: true, suspectedOffence: true, facility: { select: { name: true } }, case: { select: { id: true, caseNumber: true, status: true } },
          charges: { select: { id: true, offence: true, status: true, filedAt: true } } } }),
      this.prisma.policeCustodyEpisode.findMany({ where: { personId: id, ...fs }, orderBy: { detainedAt: 'desc' },
        select: { id: true, reference: true, status: true, detainedAt: true, closedAt: true, facility: { select: { name: true } } } }),
      this.prisma.casePerson.findMany({ where: { personId: id, case: fs }, select: { role: true, case: { select: { id: true, caseNumber: true, title: true, status: true } } } }),
      this.prisma.convictionRecord.findMany({ where: { personId: id }, orderBy: { convictedAt: 'desc' },
        select: { id: true, court: true, courtCaseRef: true, offence: true, convictedAt: true, sentenceSummary: true } }),
      this.prisma.arrest.count({ where: { personId: id, voidedAt: null } }),
    ]);
    // Act 653 s.3: records from when the person was a juvenile are withheld from users without police.juvenile.read
    const see = canSeeJuvenile(req.auth);
    const juvenileAt = (d: Date) => !!person.dateOfBirth && ageAt(person.dateOfBirth, d) < 18;
    const shownArrests = see ? arrests : arrests.filter((a) => !juvenileAt(a.arrestedAt));
    const shownCustody = see ? custody : custody.filter((c) => !juvenileAt(c.detainedAt));
    await this.audit.record(req, { action: 'police.person_record.view', outcome: 'SUCCESS', entityType: 'person', entityId: id });
    return { person, arrests: shownArrests, custody: shownCustody, cases, convictions, recordsHeldByOtherCommands: arrestsTotal - arrests.length,
      juvenileRecordsWithheld: arrests.length - shownArrests.length };
  }

  @Post('cases')
  @RequirePermission('police.case.write')
  async createCase(@Req() req: AuthedRequest, @Body() dto: CreateCaseDto) {
    const facility = await this.prisma.facility.findFirst({ where: { id: dto.facilityId, institution: { code: 'POLICE' } }, include: { orgUnit: true } });
    if (!facility) throw new BadRequestException('Unknown police station');
    await assertInScope(this.audit, req, req.scope!, facility.orgUnit.path, 'facility', facility.id);
    if (dto.suspectPersonId && !(await this.prisma.person.findUnique({ where: { id: dto.suspectPersonId } }))) throw new BadRequestException('Unknown person');
    const me = req.auth!.user.id; const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.policeIncident.create({ data: { reference: await nextRef(tx, 'incident', 'INC'), facilityId: facility.id, reportedAt: now, category: dto.offenceCategory,
        summary: dto.incidentSummary, location: dto.location, status: 'CASE_OPENED', recordedById: me } });
      return tx.policeCase.create({ data: { caseNumber: await nextRef(tx, 'case', 'CASE'), facilityId: facility.id, incidentId: incident.id, title: dto.title, offenceCategory: dto.offenceCategory,
        status: 'OPEN', openedAt: now, investigatorId: me, ...(dto.suspectPersonId ? { persons: { create: { personId: dto.suspectPersonId, role: 'SUSPECT' } } } : {}) } });
    });
    await this.audit.record(req, { action: 'police.case.create', outcome: 'SUCCESS', entityType: 'police_case', entityId: created.id });
    return created;
  }

  private async findCase(req: AuthedRequest, id: string) {
    const c = await this.prisma.policeCase.findUnique({ where: { id }, include: { facility: { include: { orgUnit: true } }, incident: true,
      persons: { include: { person: { select: { id: true, indexNumber: true, surname: true, otherNames: true } } } },
      arrests: { select: { id: true, reference: true, arrestedAt: true, suspectedOffence: true } }, charges: true, convictions: true } });
    if (!c) throw new NotFoundException();
    await assertInScope(this.audit, req, req.scope!, c.facility.orgUnit.path, 'police_case', id);
    return c;
  }

  @Get('cases/:id')
  @RequirePermission('police.case.read')
  async caseDetail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const c = await this.findCase(req, id);
    await this.audit.record(req, { action: 'police.case.view', outcome: 'SUCCESS', entityType: 'police_case', entityId: id });
    return c;
  }

  @Patch('cases/:id')
  @RequirePermission('police.case.write')
  async updateCase(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCaseDto) {
    const c = await this.findCase(req, id);
    const updated = await this.prisma.policeCase.update({ where: { id }, data: { status: dto.status, closedAt: dto.status === 'CLOSED' ? new Date() : null } });
    await this.audit.record(req, { action: 'police.case.update', outcome: 'SUCCESS', entityType: 'police_case', entityId: id, detail: { from: c.status, to: dto.status } });
    return updated;
  }
}
