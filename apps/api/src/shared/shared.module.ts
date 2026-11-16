import { BadRequestException, Body, ConflictException, Controller, Get, Module, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { nextRef } from '../common/refs';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { Public, RequirePermission } from '../auth/decorators';
import { AuthedRequest } from '../common/access';
import { ListQuery, page, paging } from '../common/pagination';

const ID_TYPES = ['GHANA_CARD', 'PASSPORT', 'DRIVERS_LICENCE', 'VOTER_ID', 'OTHER'] as const;
class CreatePersonDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) surname: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) otherNames: string;
  @ApiProperty() @IsIn(['MALE', 'FEMALE', 'UNKNOWN']) sex: 'MALE' | 'FEMALE' | 'UNKNOWN';
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) hometown?: string;
  @ApiPropertyOptional({ enum: ID_TYPES }) @IsOptional() @IsIn(ID_TYPES as unknown as string[]) identifierType?: (typeof ID_TYPES)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(4) @MaxLength(40) identifierValue?: string;
  @ApiPropertyOptional({ description: 'Set true only after a human has reviewed the possible matches and decided this is a different person' })
  @IsOptional() @IsBoolean() confirmedNotDuplicate?: boolean;
}

@ApiTags('shared')
@Controller()
export class SharedController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Public()
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', environment: process.env.NEXT_PUBLIC_ENV_LABEL ?? 'DEMONSTRATION', notice: 'Synthetic data only. Not an official system.' };
  }

  /**
   * National Person Index search — IDENTITY ONLY. Returns no arrest, conviction or custody facts;
   * those are served only by the owning institution's endpoints. Every search is audited.
   */
  @Get('persons')
  @RequirePermission('person.read')
  async persons(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const term = q.q?.trim();
    if (!term || term.length < 2) throw new BadRequestException('Enter at least 2 characters to search the person index');
    const where = { OR: [
      { surname: { contains: term, mode: 'insensitive' as const } }, { otherNames: { contains: term, mode: 'insensitive' as const } },
      { indexNumber: { equals: term, mode: 'insensitive' as const } }, { identifiers: { some: { value: { equals: term, mode: 'insensitive' as const } } } },
    ] };
    const [items, total] = await Promise.all([
      this.prisma.person.findMany({ where, orderBy: [{ surname: 'asc' }, { otherNames: 'asc' }], ...paging(q),
        select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, hometown: true, isSynthetic: true,
          identifiers: { select: { type: true, value: true, verified: true } } } }),
      this.prisma.person.count({ where }),
    ]);
    await this.audit.record(req, { action: 'person.search', outcome: 'SUCCESS', detail: { term, results: total } });
    return page(items, total, q);
  }

  /** Identity record by id — identity fields only. */
  @Get('persons/:id')
  @RequirePermission('person.read')
  async person(@Param('id', ParseUUIDPipe) id: string) {
    const p = await this.prisma.person.findUnique({ where: { id }, select: { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, hometown: true, identifiers: { select: { type: true, value: true, verified: true } } } });
    if (!p) throw new NotFoundException();
    return p;
  }

  /**
   * Create an identity record — only when necessary. The index is never merged or matched automatically:
   *  - an identifier already on file is a hard stop (409) pointing at the existing record;
   *  - similar names are returned as possible matches (409) and creation proceeds only after an
   *    officer confirms it is a different person. That confirmation is audited.
   */
  @Post('persons')
  @RequirePermission('person.write')
  async createPerson(@Req() req: AuthedRequest, @Body() dto: CreatePersonDto) {
    const surname = dto.surname.trim(); const otherNames = dto.otherNames.trim(); const idValue = dto.identifierValue?.trim();
    if (!!dto.identifierType !== !!idValue) throw new BadRequestException('Provide both the identifier type and its value, or neither');
    const sel = { id: true, indexNumber: true, surname: true, otherNames: true, sex: true, dateOfBirth: true, hometown: true };
    if (idValue) {
      const existing = await this.prisma.personIdentifier.findUnique({ where: { type_value: { type: dto.identifierType!, value: idValue } }, include: { person: { select: sel } } });
      if (existing) throw new ConflictException({ code: 'IDENTIFIER_EXISTS', message: 'This identifier is already on file. Use the existing identity record.', matches: [existing.person] });
    }
    const first = otherNames.split(/\s+/)[0];
    const matches = await this.prisma.person.findMany({ where: { surname: { equals: surname, mode: 'insensitive' }, otherNames: { contains: first, mode: 'insensitive' } }, select: sel, take: 10 });
    if (matches.length && !dto.confirmedNotDuplicate)
      throw new ConflictException({ code: 'POSSIBLE_DUPLICATES', message: 'Possible existing records found. Review them before creating a new identity.', matches });
    const person = await this.prisma.person.create({ data: { indexNumber: await nextRef(this.prisma, 'person', 'NPI'), surname, otherNames, sex: dto.sex,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null, hometown: dto.hometown, nationality: 'Ghanaian', isSynthetic: true,
      ...(idValue ? { identifiers: { create: { type: dto.identifierType!, value: idValue, verified: false } } } : {}) } });
    await this.audit.record(req, { action: 'person.create', outcome: 'SUCCESS', entityType: 'person', entityId: person.id, detail: { reviewedPossibleDuplicates: matches.length } });
    return person;
  }

  /** Configurable institutional reference data with its evidence status. Authenticated users only. */
  @Get('reference')
  async reference(@Req() req: AuthedRequest) {
    const codes = [...new Set(req.auth!.grants.map((g) => g.institution).filter((i): i is 'POLICE' | 'PRISONS' => !!i))];
    const inst = codes.length ? { institution: { code: { in: codes } } } : {};
    const sel = { institution: { select: { code: true } } };
    const [ranks, appointments, orgUnitTypes, facilityTypes] = await Promise.all([
      this.prisma.rank.findMany({ where: inst, orderBy: [{ institutionId: 'asc' }, { seniorityOrder: 'asc' }], include: sel }),
      this.prisma.appointment.findMany({ where: inst, orderBy: { title: 'asc' }, include: sel }),
      this.prisma.orgUnitType.findMany({ where: inst, orderBy: [{ institutionId: 'asc' }, { level: 'asc' }], include: sel }),
      this.prisma.facilityType.findMany({ where: inst, orderBy: { name: 'asc' }, include: sel }),
    ]);
    return { ranks, appointments, orgUnitTypes, facilityTypes };
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @RequirePermission('platform.users.manage')
  async users(@Query() q: ListQuery) {
    const where = q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' as const } }, { displayName: { contains: q.q, mode: 'insensitive' as const } }] } : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { email: 'asc' }, ...paging(q),
        select: { id: true, email: true, displayName: true, status: true, lastLoginAt: true,
          roleAssignments: { select: { role: { select: { name: true, code: true } }, orgUnit: { select: { name: true } } } } } }),
      this.prisma.user.count({ where }),
    ]);
    return page(items, total, q);
  }
}

@Module({ controllers: [SharedController, AdminController] })
export class SharedModule {}
