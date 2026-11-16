import { BadRequestException, Body, ConflictException, Controller, Get, Module, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsDateString, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { Public, RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { nextRef } from '../common/refs';

const ID_TYPES = ['GHANA_CARD', 'PASSPORT'] as const;
class ApplyDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(160) fullName: string;
  @ApiProperty() @IsDateString() dateOfBirth: string;
  @ApiProperty({ enum: ID_TYPES }) @IsIn(ID_TYPES as unknown as string[]) identifierType: (typeof ID_TYPES)[number];
  @ApiProperty() @IsString() @MinLength(4) @MaxLength(40) identifierValue: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(120) purpose: string;
  @ApiProperty({ description: 'Code of an available clearance service type' }) @IsString() @MaxLength(40) serviceTypeCode: string;
  @ApiProperty({ description: 'Applicant confirms the residence eligibility rule' }) @IsBoolean() residenceAttested: boolean;
  @ApiProperty({ description: 'Ghana Post office for delivery' }) @IsString() @MinLength(3) @MaxLength(120) deliveryPostOffice: string;
}
const ACTIVE = ['SUBMITTED', 'PAYMENT_CONFIRMED', 'APPOINTMENT_BOOKED', 'BIOMETRICS_CAPTURED', 'ADDITIONAL_INFO_REQUESTED', 'UNDER_INVESTIGATION',
  'VALIDATED', 'IDENTITY_VERIFIED', 'RECORDS_SEARCHED', 'UNDER_REVIEW', 'APPROVED'] as const;
/** What an applicant may see of their own application: status and certificate, never internal findings. */
const APPLICANT_VIEW = { id: true, reference: true, fullName: true, dateOfBirth: true, identifierType: true, purpose: true, status: true, submittedAt: true, updatedAt: true,
  appointmentAt: true, captureCentre: true, deliveryPostOffice: true, parcelBatchNo: true, dispatchedAt: true, serviceType: { select: { name: true, vettingFeeGhs: true, addOnFeeGhs: true } },
  certificate: { select: { id: true, certificateNumber: true, verificationCode: true, status: true, resultSummary: true, issuedAt: true, expiresAt: true, signatoryTitle: true, signsFor: true } } } as const;

/** Public applicant channel. Isolated from every internal record; scoped to the signed-in applicant's own data. */
@ApiTags('applicant')
@Controller('applicant/background-checks')
export class ApplicantController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  @RequirePermission('applicant.bgcheck.submit')
  mine(@Req() req: AuthedRequest) {
    return this.prisma.backgroundCheckApplication.findMany({ where: { applicantUserId: req.auth!.user.id }, orderBy: { submittedAt: 'desc' }, select: APPLICANT_VIEW });
  }

  /** Services currently open for applications, with the published fees (display only). */
  @Get('service-types')
  @RequirePermission('applicant.bgcheck.submit')
  serviceTypes() {
    return this.prisma.clearanceServiceType.findMany({ orderBy: { sortOrder: 'asc' }, select: { code: true, name: true, vettingFeeGhs: true, addOnFeeGhs: true, available: true, requiresFingerprints: true } });
  }

  @Get(':id')
  @RequirePermission('applicant.bgcheck.submit')
  async one(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const a = await this.prisma.backgroundCheckApplication.findFirst({ where: { id, applicantUserId: req.auth!.user.id }, select: APPLICANT_VIEW });
    if (!a) throw new NotFoundException(); // another applicant's record is indistinguishable from a missing one
    return a;
  }

  @Post()
  @RequirePermission('applicant.bgcheck.submit')
  @Throttle({ default: { limit: 10, ttl: 3600_000 } })
  async apply(@Req() req: AuthedRequest, @Body() dto: ApplyDto) {
    const service = await this.prisma.clearanceServiceType.findUnique({ where: { code: dto.serviceTypeCode } });
    if (!service || !service.available) throw new BadRequestException('Choose a clearance service that is currently available');
    if (!dto.residenceAttested) throw new BadRequestException('Applicants must meet the residence rule (resident in Ghana for over 3 months after more than 6 months abroad)');
    const dob = new Date(dto.dateOfBirth);
    if (dob.getTime() > Date.now() - 16 * 365.25 * 86400_000) throw new BadRequestException('Applicant must be at least 16 years old');
    if (await this.prisma.backgroundCheckApplication.count({ where: { applicantUserId: req.auth!.user.id, identifierValue: dto.identifierValue.trim(), status: { in: [...ACTIVE] } } }))
      throw new ConflictException('You already have an application in progress for this identity document');
    const a = await this.prisma.backgroundCheckApplication.create({ data: { reference: await nextRef(this.prisma, 'bgcheck', 'BGC'), applicantUserId: req.auth!.user.id,
      fullName: dto.fullName.trim(), dateOfBirth: dob, identifierType: dto.identifierType, identifierValue: dto.identifierValue.trim(), purpose: dto.purpose.trim(),
      serviceTypeId: service.id, residenceAttested: true, deliveryPostOffice: dto.deliveryPostOffice.trim() }, select: APPLICANT_VIEW });
    await this.audit.record(req, { action: 'applicant.bgcheck.submit', outcome: 'SUCCESS', entityType: 'background_check_application', entityId: a.id });
    return a;
  }
}

/**
 * Public certificate verification. Holding the code (printed on the certificate) is what grants this view:
 * it confirms authenticity and status and repeats what is printed on the certificate — nothing more.
 */
@ApiTags('verify')
@Controller('verify')
export class VerifyController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':code')
  async verify(@Req() req: AuthedRequest, @Param('code') raw: string) {
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(?!$)/g, '$1-');
    if (!/^[A-Z0-9-]{14}$/.test(code)) throw new BadRequestException('Enter the 12-character verification code printed on the certificate');
    const c = await this.prisma.clearanceCertificate.findUnique({ where: { verificationCode: code }, include: { application: { select: { fullName: true, dateOfBirth: true, purpose: true } } } });
    await this.audit.record(req, { action: 'certificate.verify', outcome: c ? 'SUCCESS' : 'FAILURE', entityType: 'clearance_certificate', entityId: c?.id, detail: { found: !!c } });
    if (!c) return { valid: false, message: 'No certificate matches this code.' };
    const expired = !!c.expiresAt && c.expiresAt < new Date();
    const status = c.status === 'VALID' && expired ? 'EXPIRED' : c.status;
    return { valid: status === 'VALID', status, certificateNumber: c.certificateNumber, holderName: c.application.fullName, dateOfBirth: c.application.dateOfBirth,
      purpose: c.application.purpose, resultSummary: c.resultSummary, issuedAt: c.issuedAt, expiresAt: c.expiresAt, signatoryTitle: c.signatoryTitle, signsFor: c.signsFor, specimen: true };
  }
}

@Module({ controllers: [ApplicantController, VerifyController] })
export class ApplicantModule {}
