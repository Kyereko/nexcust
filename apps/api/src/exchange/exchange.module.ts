import { BadRequestException, Body, Controller, ForbiddenException, Get, Module, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';

class ExchangeDto {
  @ApiProperty() @IsUUID() personId: string;
  @ApiProperty({ enum: ['POLICE', 'PRISONS'], description: 'The institution being asked (must differ from the requester\'s)' }) @IsIn(['POLICE', 'PRISONS']) providingInstitution: 'POLICE' | 'PRISONS';
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(300) purpose: string;
  @ApiProperty({ description: 'Legal or operational basis for the request' }) @IsString() @MinLength(5) @MaxLength(300) legalBasis: string;
}

/**
 * Authorized information exchange — the ONLY path by which one institution sees the other's records.
 * A request names a person, a purpose and a legal basis; the answer is a minimal, fixed summary
 * (status and dates, no case narrative), stored with the request and audited. Disclosure scope is
 * a demonstration assumption pending an inter-agency agreement.
 */
@ApiTags('exchange')
@Controller('exchange/requests')
export class ExchangeController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Post()
  @RequirePermission('exchange.request')
  async request(@Req() req: AuthedRequest, @Body() dto: ExchangeDto) {
    const requesting = req.auth!.grants.find((g) => g.permissions.has('exchange.request') && g.institution)?.institution;
    if (!requesting) throw new ForbiddenException('Only institutional officers can make exchange requests');
    if (requesting === dto.providingInstitution) throw new BadRequestException('Use your own institution\'s records directly; exchange is for the other institution');
    const person = await this.prisma.person.findUnique({ where: { id: dto.personId }, select: { id: true, indexNumber: true } });
    if (!person) throw new BadRequestException('Unknown person');
    const summary = dto.providingInstitution === 'POLICE' ? await this.policeSummary(person.id) : await this.prisonsSummary(person.id);
    const r = await this.prisma.dataExchangeRequest.create({ data: { requestingInstitution: requesting, providingInstitution: dto.providingInstitution, personId: person.id,
      purpose: dto.purpose, legalBasis: dto.legalBasis, requestedById: req.auth!.user.id, status: 'FULFILLED', disclosedSummary: summary } });
    await this.audit.record(req, { action: 'exchange.request', outcome: 'SUCCESS', entityType: 'data_exchange_request', entityId: r.id,
      detail: { providingInstitution: dto.providingInstitution, personIndex: person.indexNumber, purpose: dto.purpose } });
    return r;
  }

  /** Only the officer who made the request can read the disclosed answer again. */
  @Get(':id')
  @RequirePermission('exchange.request')
  async one(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const r = await this.prisma.dataExchangeRequest.findUnique({ where: { id } });
    if (!r || r.requestedById !== req.auth!.user.id) throw new NotFoundException();
    return r;
  }

  /** Police → prisons: police custody episodes (status and dates only). */
  private async policeSummary(personId: string) {
    const all = await this.prisma.policeCustodyEpisode.findMany({ where: { personId }, orderBy: { detainedAt: 'desc' }, take: 10,
      select: { reference: true, status: true, detainedAt: true, closedAt: true, isJuvenile: true, facility: { select: { name: true } } } });
    const eps = all.filter((e) => !e.isJuvenile).slice(0, 5); // juvenile records are never disclosed across institutions (Act 653 s.3)
    return { kind: 'POLICE_CUSTODY_SUMMARY', asAt: new Date().toISOString(), currentlyInPoliceCustody: eps.some((e) => e.status === 'IN_CUSTODY'),
      juvenileRecordsWithheld: all.length - all.filter((e) => !e.isJuvenile).length,
      episodes: eps.map((e) => ({ reference: e.reference, station: e.facility.name, status: e.status, detainedAt: e.detainedAt, closedAt: e.closedAt })) };
  }

  /** Prisons → police: whether and where the person is held (no sentence details). */
  private async prisonsSummary(personId: string) {
    const rec = await this.prisma.prisonerRecord.findUnique({ where: { personId }, select: { prisonerNumber: true,
      episodes: { orderBy: { startedAt: 'desc' }, take: 5, select: { status: true, classification: true, startedAt: true, endedAt: true, facility: { select: { name: true } } } } } });
    return { kind: 'PRISON_CUSTODY_SUMMARY', asAt: new Date().toISOString(), hasPrisonerRecord: !!rec,
      currentlyInPrisonCustody: !!rec?.episodes.some((e) => e.status === 'IN_CUSTODY' || e.status === 'IN_TRANSIT'),
      episodes: (rec?.episodes ?? []).map((e) => ({ establishment: e.facility.name, status: e.status, classification: e.classification, from: e.startedAt, to: e.endedAt })) };
  }
}

@Module({ controllers: [ExchangeController] })
export class ExchangeModule {}
