import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';
import { nextRef } from '../common/refs';

/**
 * Police clearance processing modelled on the Ghana Police Service eServices portal (docs/research/10):
 *   SUBMITTED → PAYMENT_CONFIRMED → APPOINTMENT_BOOKED → BIOMETRICS_CAPTURED (attendance) → RECORDS_SEARCHED ("criminal ident")
 *   → [UNDER_INVESTIGATION when IDENT] → UNDER_REVIEW → decision by an authorised signatory → CERTIFICATE_ISSUED → DISPATCHED (Ghana Post)
 * ADDITIONAL_INFO_REQUESTED can interrupt any processing stage and resumes where it left off.
 * NEXCUST complements the official portal; it does not replace it. The system never decides the result.
 */
const FLOW: Record<string, string> = { SUBMITTED: 'PAYMENT_CONFIRMED', PAYMENT_CONFIRMED: 'APPOINTMENT_BOOKED', APPOINTMENT_BOOKED: 'BIOMETRICS_CAPTURED',
  BIOMETRICS_CAPTURED: 'RECORDS_SEARCHED', UNDER_INVESTIGATION: 'UNDER_REVIEW',
  // first-prototype records
  VALIDATED: 'APPOINTMENT_BOOKED', IDENTITY_VERIFIED: 'RECORDS_SEARCHED' };
const PROCESSING = ['SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'RECORDS_SEARCHED', 'UNDER_INVESTIGATION', 'VALIDATED', 'IDENTITY_VERIFIED'];
const next = (a: { status: string; criminalIdent: string | null }) => a.status === 'RECORDS_SEARCHED' ? (a.criminalIdent === 'IDENT' ? 'UNDER_INVESTIGATION' : 'UNDER_REVIEW') : FLOW[a.status];

const validityMonths = () => Number(process.env.CERTIFICATE_VALIDITY_MONTHS ?? 6);
const CLEAN_WORDING = () => process.env.CLEARANCE_CLEAN_WORDING ?? 'does not appear in the criminal records of the Ghana Police Service';
const addMonths = (d: Date, m: number) => { const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + m); return r; };
/** Unambiguous verification code (no 0/O/1/I), 12 characters. A NEXCUST feature — the GPS portal has no public check. */
const verificationCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = randomBytes(12); return Array.from(b, (x) => a[x % a.length]).join('').replace(/(.{4})(?!$)/g, '$1-'); };
const IDENT = ['IDENT', 'NOT_IDENT', 'NOT_RECORDED'] as const;

class AdvanceDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(1000) note: string;
  @ApiPropertyOptional({ description: 'PAYMENT_CONFIRMED: Ghana.gov payment reference' }) @IsOptional() @IsString() @MaxLength(80) paymentRef?: string;
  @ApiPropertyOptional({ description: 'APPOINTMENT_BOOKED' }) @IsOptional() @IsDateString() appointmentAt?: string;
  @ApiPropertyOptional({ description: 'APPOINTMENT_BOOKED: capture centre (regional command or Nima, Accra)' }) @IsOptional() @IsString() @MaxLength(120) captureCentre?: string;
  @ApiPropertyOptional({ description: 'BIOMETRICS_CAPTURED: index record the attendance officer matched, or none' }) @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional({ enum: IDENT, description: 'RECORDS_SEARCHED: the criminal-records search result entered by the records officer' }) @IsOptional() @IsIn(IDENT as unknown as string[]) criminalIdent?: (typeof IDENT)[number];
}
class InfoRequestDto { @ApiProperty() @IsString() @MinLength(5) @MaxLength(500) note: string; }
class DecisionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] }) @IsIn(['APPROVE', 'REJECT']) decision: 'APPROVE' | 'REJECT';
  @ApiPropertyOptional({ description: 'Result wording for an investigated record (required after UNDER_INVESTIGATION), or the reason for rejection' }) @IsOptional() @IsString() @MinLength(5) @MaxLength(500) note?: string;
}
class DispatchDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(120) deliveryPostOffice: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(60) parcelBatchNo: string;
}

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
        select: { id: true, reference: true, fullName: true, purpose: true, status: true, submittedAt: true, updatedAt: true, serviceType: { select: { name: true } } } }),
      this.prisma.backgroundCheckApplication.count({ where }),
    ]);
    return page(items, total, q);
  }

  /** Service catalogue and signatory register (reference data with evidence status). */
  @Get('reference')
  @RequirePermission('police.bgcheck.read')
  async reference() {
    const [serviceTypes, signatories] = await Promise.all([
      this.prisma.clearanceServiceType.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.authorisedSignatory.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: signatories.map((x) => x.userId) } }, select: { id: true, displayName: true } })).map((u) => [u.id, u.displayName]));
    return { serviceTypes, signatories: signatories.map((x) => ({ ...x, name: users.get(x.userId) ?? null })), certificateValidityMonths: validityMonths(), cleanWording: CLEAN_WORDING(),
      targetBusinessDays: Number(process.env.CLEARANCE_TARGET_BUSINESS_DAYS ?? 8) };
  }

  private async load(id: string) {
    const a = await this.prisma.backgroundCheckApplication.findUnique({ where: { id }, include: {
      serviceType: true,
      person: { select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, identifiers: { select: { type: true, value: true, verified: true } } } },
      reviews: { orderBy: { createdAt: 'asc' } }, certificate: true } });
    if (!a) throw new NotFoundException();
    return a;
  }

  @Get(':id')
  @RequirePermission('police.bgcheck.read')
  async detail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const a = await this.load(id);
    const ids = [...new Set(a.reviews.map((r) => r.reviewerId).concat(a.certificate ? [a.certificate.issuedById] : []))];
    const users = new Map((await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } })).map((u) => [u.id, u.displayName]));
    // Attendance: candidate index records (document number first, then surname + date of birth)
    const surname = a.fullName.trim().split(/\s+/).pop() ?? '';
    const candidates = ['APPOINTMENT_BOOKED', 'VALIDATED'].includes(a.status) ? await this.prisma.person.findMany({ take: 10, where: { OR: [
      { identifiers: { some: { type: a.identifierType, value: { equals: a.identifierValue, mode: 'insensitive' } } } },
      { surname: { equals: surname, mode: 'insensitive' }, dateOfBirth: a.dateOfBirth },
    ] }, select: { id: true, indexNumber: true, surname: true, otherNames: true, dateOfBirth: true, identifiers: { select: { type: true, value: true } } } }) : [];
    // Supporting evidence for the records officer: court-recorded convictions held in NEXCUST for the matched person
    const convictions = a.personId && ['BIOMETRICS_CAPTURED', 'IDENTITY_VERIFIED', 'RECORDS_SEARCHED', 'UNDER_INVESTIGATION', 'UNDER_REVIEW'].includes(a.status)
      ? await this.prisma.convictionRecord.findMany({ where: { personId: a.personId }, orderBy: { convictedAt: 'desc' }, select: { court: true, courtCaseRef: true, offence: true, convictedAt: true, sentenceSummary: true } }) : [];
    const signatory = await this.prisma.authorisedSignatory.findUnique({ where: { userId: req.auth!.user.id } });
    await this.audit.record(req, { action: 'police.bgcheck.view', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id });
    return { ...a, nextStage: next(a) ?? null, candidates, convictions, viewerIsSignatory: !!signatory?.active,
      reviews: a.reviews.map((r) => ({ ...r, reviewerName: users.get(r.reviewerId) ?? null })),
      certificate: a.certificate && { ...a.certificate, issuedByName: users.get(a.certificate.issuedById) ?? null } };
  }

  /** Record the next processing stage. Each step is a named officer's action. */
  @Post(':id/advance')
  @RequirePermission('police.bgcheck.review')
  async advance(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdvanceDto) {
    const a = await this.load(id);
    const stage = a.status === 'ADDITIONAL_INFO_REQUESTED' ? a.resumeStatus : next(a);
    if (!stage || !PROCESSING.includes(a.status === 'ADDITIONAL_INFO_REQUESTED' ? 'SUBMITTED' : a.status)) throw new ConflictException(`Application is ${a.status}; it is not awaiting a processing step`);
    const data: Record<string, unknown> = { status: stage, resumeStatus: null };
    let findings: object | undefined;
    if (a.status !== 'ADDITIONAL_INFO_REQUESTED') {
      if (stage === 'PAYMENT_CONFIRMED') { if (!dto.paymentRef) throw new BadRequestException('Enter the payment reference'); data.paymentRef = dto.paymentRef; }
      if (stage === 'APPOINTMENT_BOOKED') {
        if (!a.serviceType?.requiresFingerprints && a.serviceType) { data.biometricCaptureMode = 'NOT_TAKEN_NOMINAL'; }
        else { if (!dto.appointmentAt || !dto.captureCentre) throw new BadRequestException('Enter the fingerprint appointment date and capture centre'); data.appointmentAt = new Date(dto.appointmentAt); data.captureCentre = dto.captureCentre; }
      }
      if (stage === 'BIOMETRICS_CAPTURED') {
        if (dto.personId && !(await this.prisma.person.findUnique({ where: { id: dto.personId } }))) throw new BadRequestException('Unknown person record');
        data.attendedAt = new Date(); data.personId = dto.personId ?? null; data.biometricCaptureMode = a.biometricCaptureMode ?? 'LIVE_SCAN_AT_CENTRE';
        findings = { linkedPersonId: dto.personId ?? null, basis: dto.personId ? 'Attendance officer matched the applicant to an index record' : 'No matching index record' };
      }
      if (stage === 'RECORDS_SEARCHED') {
        if (!dto.criminalIdent) throw new BadRequestException('Enter the criminal-records search result (Ident, Not ident or Not recorded)');
        data.criminalIdent = dto.criminalIdent;
        const convictions = a.personId ? await this.prisma.convictionRecord.count({ where: { personId: a.personId } }) : 0;
        findings = { criminalIdent: dto.criminalIdent, searchedAt: new Date().toISOString(), nexcustConvictionsOnFile: convictions, scope: 'Court-recorded convictions (disclosure rule)' };
      }
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.backgroundCheckApplication.update({ where: { id }, data: data as never }),
      this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: stage as never, reviewerId: req.auth!.user.id, note: dto.note, findings } }),
    ]);
    await this.audit.record(req, { action: 'police.bgcheck.advance', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id, detail: { stage } });
    return updated;
  }

  @Post(':id/request-info')
  @RequirePermission('police.bgcheck.review')
  async requestInfo(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: InfoRequestDto) {
    const a = await this.load(id);
    if (!PROCESSING.includes(a.status) && a.status !== 'UNDER_REVIEW') throw new ConflictException(`Application is ${a.status}`);
    const [updated] = await this.prisma.$transaction([
      this.prisma.backgroundCheckApplication.update({ where: { id }, data: { status: 'ADDITIONAL_INFO_REQUESTED', resumeStatus: a.status } }),
      this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: 'ADDITIONAL_INFO_REQUESTED', reviewerId: req.auth!.user.id, note: dto.note } }),
    ]);
    await this.audit.record(req, { action: 'police.bgcheck.request_info', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id });
    return updated;
  }

  /**
   * Decision and signature by an authorised signatory "for the Director-General, CID". The signatory must not have
   * processed the application (NEXCUST control). A clean result uses the published wording; an investigated record
   * needs the signatory's own wording — the system never generates an adverse certificate.
   */
  @Post(':id/decision')
  @RequirePermission('police.bgcheck.approve')
  async decide(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto) {
    const a = await this.load(id);
    if (a.status !== 'UNDER_REVIEW') throw new ConflictException(`Application is ${a.status}, not awaiting a decision`);
    const me = req.auth!.user.id;
    const deny = async (reason: string, msg: string, Ex: typeof ForbiddenException | typeof ConflictException) => {
      await this.audit.record(req, { action: 'police.bgcheck.decision', outcome: 'DENIED', entityType: 'background_check_application', entityId: id, detail: { reason } });
      throw new Ex(msg);
    };
    if (a.reviews.some((r) => r.reviewerId === me)) await deny('maker_checker_same_user', 'An officer who processed this application cannot also decide it (maker–checker rule)', ConflictException);
    const signatory = await this.prisma.authorisedSignatory.findUnique({ where: { userId: me } });
    if (!signatory?.active) await deny('not_authorised_signatory', 'Only an officer on the authorised signatory register can sign clearance certificates', ForbiddenException);
    const investigated = a.reviews.some((r) => r.stage === 'UNDER_INVESTIGATION') || a.criminalIdent === 'IDENT';
    if (dto.decision === 'REJECT' || investigated) { if (!dto.note) throw new BadRequestException(dto.decision === 'REJECT' ? 'Give the reason for rejection' : 'An investigated record needs the signatory’s own result wording'); }
    if (dto.decision === 'REJECT') {
      const [updated] = await this.prisma.$transaction([
        this.prisma.backgroundCheckApplication.update({ where: { id }, data: { status: 'REJECTED' } }),
        this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: 'REJECTED', reviewerId: me, note: dto.note } }),
      ]);
      await this.audit.record(req, { action: 'police.bgcheck.decision', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id, detail: { decision: 'REJECT' } });
      return updated;
    }
    const now = new Date();
    const resultSummary = investigated ? dto.note! : `The applicant ${CLEAN_WORDING()}.`;
    const cert = await this.prisma.$transaction(async (tx) => {
      await tx.backgroundCheckApplication.update({ where: { id }, data: { status: 'CERTIFICATE_ISSUED' } });
      await tx.backgroundCheckReview.create({ data: { applicationId: id, stage: 'APPROVED', reviewerId: me, note: dto.note ?? 'Approved and signed' } });
      await tx.authorisedSignatory.update({ where: { id: signatory!.id }, data: { timesUsed: { increment: 1 } } });
      return tx.clearanceCertificate.create({ data: { applicationId: id, certificateNumber: await nextRef(tx, 'bgcheck', 'PCC'), verificationCode: verificationCode(), resultSummary,
        issuedById: me, signatoryTitle: signatory!.signatoryTitle, signsFor: signatory!.signsFor, issuedAt: now, expiresAt: addMonths(now, validityMonths()) } });
    });
    await this.audit.record(req, { action: 'police.bgcheck.certificate_issue', outcome: 'SUCCESS', entityType: 'clearance_certificate', entityId: cert.id, detail: { applicationId: id } });
    return cert;
  }

  /** Delivery by Ghana Post to the applicant's chosen post office (portal "Logistics" step). */
  @Post(':id/dispatch')
  @RequirePermission('police.bgcheck.review')
  async dispatch(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DispatchDto) {
    const a = await this.load(id);
    if (a.status !== 'CERTIFICATE_ISSUED') throw new ConflictException('Only an issued certificate can be dispatched');
    const [updated] = await this.prisma.$transaction([
      this.prisma.backgroundCheckApplication.update({ where: { id }, data: { status: 'DISPATCHED', deliveryPostOffice: dto.deliveryPostOffice, parcelBatchNo: dto.parcelBatchNo, dispatchedAt: new Date() } }),
      this.prisma.backgroundCheckReview.create({ data: { applicationId: id, stage: 'DISPATCHED', reviewerId: req.auth!.user.id, note: `Ghana Post to ${dto.deliveryPostOffice}, batch ${dto.parcelBatchNo}` } }),
    ]);
    await this.audit.record(req, { action: 'police.bgcheck.dispatch', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: id });
    return updated;
  }
}
