import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';
import { nextRef } from '../common/refs';

/** Linear review pipeline. Each step is a named officer's action, recorded as a review entry. */
const NEXT: Record<string, string> = { SUBMITTED: 'VALIDATED', VALIDATED: 'IDENTITY_VERIFIED', IDENTITY_VERIFIED: 'RECORDS_SEARCHED', RECORDS_SEARCHED: 'UNDER_REVIEW' };
const validityDays = () => Number(process.env.CERTIFICATE_VALIDITY_DAYS ?? 180);
/** Unambiguous verification code (no 0/O/1/I), 12 characters, ~60 bits. */
const verificationCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = randomBytes(12); return Array.from(b, (x) => a[x % a.length]).join('').replace(/(.{4})(?!$)/g, '$1-'); };

class AdvanceDto {
  @ApiProperty({ enum: Object.values(NEXT) }) @IsIn(Object.values(NEXT)) stage: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(1000) note: string;
  @ApiPropertyOptional({ description: 'IDENTITY_VERIFIED only: the National Person Index record the officer has matched, or omit when none exists' })
  @IsOptional() @IsUUID() personId?: string;
}
class DecisionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] }) @IsIn(['APPROVE', 'REJECT']) decision: 'APPROVE' | 'REJECT';
  @ApiProperty({ description: 'Approving officer\'s statement of the result to be printed on the certificate, or the rejection reason' }) @IsString() @MinLength(5) @MaxLength(500) note: string;
}

/**
 * Workflow C — internal case processing for police clearance. Designed to complement, not replace, the
 * Ghana Police Service's existing online clearance service.
 *
 * Disclosure rule (demonstration): only court-recorded CONVICTIONS are disclosed by the records search.
 * Arrests, charges and custody are never disclosed on a clearance. The approving officer decides; the system does not.
 */
@ApiTags('police')
@Controller('police/background-checks')
export class PoliceBackgroundCheckController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('police.bgcheck.read')
  async list(@Query() q: ListQuery) {
    const where = { ...(q.status ? { status: q.status as never } : {}),
      ...(q.q ? { OR: [{ reference: { contains: q.q, mode: 'insensitive' as const } }, { fullName: { contains: q.q, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.backgroundCheckApplication.findMany({ where, orderBy: { submittedAt: 'desc' }, ...paging(q),
        select: { id: true, reference: true, fullName: true, purpose: true, status: true, submittedAt: true, updatedAt: true } }),
      this.prisma.backgroundCheckApplication.count({ where }),
    ]);
    return page(items, total, q);
  }

  private async load(id: string) {
    const a = await this.prisma.backgroundCheckApplication.findUnique({ where: { id }, include: {
      person: { select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, identifiers: { select: { type: true, value: true, verified: true } } } },
      reviews: { orderBy: { createdAt: 'asc' } }, certificate: true } });
    if (!a) throw new NotFoundException();
    return a;
  }

  @Get(':id')
  @RequirePermission('police.bgcheck.read')
  async detail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const a = await this.load(id);
    const reviewerIds = [...new Set(a.reviews.map((r) => r.reviewerId).concat(a.certificate ? [a.certificate.issuedById] : []))];
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, displayName: true } })).map((u) => [u.id, u.displayName]));
    // Candidate index records for identity verification: exact identifier match first, then surname + date of birth.
    const surname = a.fullName.trim().split(/\s+/).pop() ?? '';
    const candidates = a.status === 'VALIDATED' ? await this.prisma.person.findMany({ take: 10, where: { OR: [
      { identifiers: { some: { type: a.identifierType, value: { equals: a.identifierValue, mode: 'insensitive' } } } },
      { surname: { equals: surname, mode: 'insensitive' }, dateOfBirth: a.dateOfBirth },
    ] }, select: { id: true, indexNumber: true, surname: true, otherNames: true, dateOfBirth: true, identifiers: { select: { type: true, value: true } } } }) : [];
    await this.audit.record(req, { action: 'police.bgcheck.view', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id });
    return { ...a, candidates, reviews: a.reviews.map((r) => ({ ...r, reviewerName: users.get(r.reviewerId) ?? null })),
      certificate: a.certificate && { ...a.certificate, issuedByName: users.get(a.certificate.issuedById) ?? null } };
  }

  @Post(':id/advance')
  @RequirePermission('police.bgcheck.review')
  async advance(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdvanceDto) {
    const a = await this.load(id);
    if (NEXT[a.status] !== dto.stage) throw new ConflictException(`Application is ${a.status}; the next step is ${NEXT[a.status] ?? 'a decision by an approving officer'}`);
    const me = req.auth!.user.id;
    let findings: object | undefined; let personId: string | null | undefined;
    if (dto.stage === 'IDENTITY_VERIFIED') {
      if (dto.personId && !(await this.prisma.person.findUnique({ where: { id: dto.personId } }))) throw new BadRequestException('Unknown person record');
      personId = dto.personId ?? null;
      findings = { linkedPersonId: personId, basis: personId ? 'Officer matched the applicant to an index record' : 'No matching index record' };
    }
    if (dto.stage === 'RECORDS_SEARCHED') {
      const convictions = a.personId ? await this.prisma.convictionRecord.findMany({ where: { personId: a.personId }, orderBy: { convictedAt: 'desc' },
        select: { court: true, courtCaseRef: true, offence: true, convictedAt: true, sentenceSummary: true } }) : [];
      findings = { searchedAt: new Date().toISOString(), scope: 'Court-recorded convictions (demonstration disclosure rule)', personLinked: !!a.personId, convictions };
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.backgroundCheckApplication.update({ where: { id }, data: { status: dto.stage as never, ...(personId !== undefined ? { personId } : {}) } }),
      this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: dto.stage as never, reviewerId: me, note: dto.note, findings } }),
    ]);
    await this.audit.record(req, { action: 'police.bgcheck.advance', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id, detail: { stage: dto.stage } });
    return updated;
  }

  /** Approving officer's decision. Must differ from the officer who completed the review (maker–checker). */
  @Post(':id/decision')
  @RequirePermission('police.bgcheck.approve')
  async decide(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto) {
    const a = await this.load(id);
    if (a.status !== 'UNDER_REVIEW') throw new ConflictException(`Application is ${a.status}, not awaiting a decision`);
    const me = req.auth!.user.id;
    if (a.reviews.some((r) => r.reviewerId === me)) {
      await this.audit.record(req, { action: 'police.bgcheck.decision', outcome: 'DENIED', entityType: 'background_check_application', entityId: id, detail: { reason: 'maker_checker_same_user' } });
      throw new ConflictException('An officer who processed this application cannot also decide it (maker–checker rule)');
    }
    if (dto.decision === 'REJECT') {
      const [updated] = await this.prisma.$transaction([
        this.prisma.backgroundCheckApplication.update({ where: { id }, data: { status: 'REJECTED' } }),
        this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: 'REJECTED', reviewerId: me, note: dto.note } }),
      ]);
      await this.audit.record(req, { action: 'police.bgcheck.decision', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id, detail: { decision: 'REJECT' } });
      return updated;
    }
    const now = new Date();
    const cert = await this.prisma.$transaction(async (tx) => {
      await tx.backgroundCheckApplication.update({ where: { id }, data: { status: 'CERTIFICATE_ISSUED' } });
      await tx.backgroundCheckReview.create({ data: { applicationId: id, stage: 'APPROVED', reviewerId: me, note: dto.note } });
      return tx.clearanceCertificate.create({ data: { applicationId: id, certificateNumber: await nextRef(tx, 'bgcheck', 'PCC'), verificationCode: verificationCode(),
        resultSummary: dto.note, issuedById: me, issuedAt: now, expiresAt: new Date(now.getTime() + validityDays() * 86400_000) } });
    });
    await this.audit.record(req, { action: 'police.bgcheck.certificate_issue', outcome: 'SUCCESS', entityType: 'clearance_certificate', entityId: cert.id, detail: { applicationId: id } });
    return cert;
  }
}
