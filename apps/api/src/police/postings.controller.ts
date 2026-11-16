import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators';
import { AuthedRequest, unitWhere } from '../common/access';
import { assertDifferentActor, assertInScope } from '../common/guards';
import { ListQuery, page, paging } from '../common/pagination';

class ProposePostingDto {
  @ApiProperty() @IsUUID() personnelId: string;
  @ApiProperty() @IsUUID() toOrgUnitId: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(500) reason: string;
}
class RejectDto { @ApiProperty() @IsString() @MinLength(5) @MaxLength(500) reason: string; }

const POLICE = { institution: { code: 'POLICE' as const } };
const postingInclude = { personnel: { select: { id: true, serviceNumber: true, surname: true, otherNames: true, currentRank: { select: { abbreviation: true, name: true } } } },
  fromOrgUnit: { select: { id: true, name: true, path: true } }, toOrgUnit: { select: { id: true, name: true, path: true } } };

/**
 * Workflow B — posting change: HR proposes → an authorized supervisor of the releasing command approves →
 * the receiving command confirms → current posting switches; the previous posting is kept as history.
 * Rank and appointment are untouched: a posting only changes where the officer serves.
 */
@ApiTags('police')
@Controller('police')
export class PolicePostingsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Units a posting can target (whole service; a posting may cross commands). */
  @Get('org-units')
  @RequirePermission('police.facility.read')
  orgUnits() {
    return this.prisma.organizationalUnit.findMany({ where: { ...POLICE, validTo: null }, orderBy: [{ type: { level: 'asc' } }, { name: 'asc' }], select: { id: true, name: true, type: { select: { name: true } } } });
  }

  @Get('personnel/:id')
  @RequirePermission('police.personnel.read')
  async personnelDetail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const p = await this.prisma.policePersonnel.findUnique({ where: { id }, include: { currentRank: true, currentOrgUnit: { include: { type: true } },
      rankHistory: { orderBy: { effectiveFrom: 'desc' }, include: { rank: { select: { name: true, abbreviation: true } } } },
      commands: { orderBy: { effectiveFrom: 'desc' }, include: { appointment: { select: { title: true } }, orgUnit: { select: { name: true } } } },
      postings: { orderBy: [{ effectiveFrom: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }], include: { fromOrgUnit: { select: { name: true } }, toOrgUnit: { select: { name: true } } } } } });
    if (!p) throw new NotFoundException();
    await assertInScope(this.audit, req, req.scope!, p.currentOrgUnit.path, 'police_personnel', id);
    return p;
  }

  @Get('postings')
  @RequirePermission('police.personnel.read')
  async list(@Req() req: AuthedRequest, @Query() q: ListQuery) {
    const uw = unitWhere(req.scope!);
    const where = { OR: [{ toOrgUnit: uw }, { personnel: { currentOrgUnit: uw } }], ...(q.status ? { status: q.status as never } : { status: { in: ['PROPOSED', 'APPROVED'] as ('PROPOSED' | 'APPROVED')[] } }) };
    const [items, total] = await Promise.all([
      this.prisma.policePosting.findMany({ where, orderBy: { createdAt: 'desc' }, ...paging(q), include: postingInclude }),
      this.prisma.policePosting.count({ where }),
    ]);
    return page(items.map(({ fromOrgUnit, toOrgUnit, ...r }) => ({ ...r, fromOrgUnit: fromOrgUnit && { id: fromOrgUnit.id, name: fromOrgUnit.name }, toOrgUnit: { id: toOrgUnit.id, name: toOrgUnit.name } })), total, q);
  }

  @Post('postings')
  @RequirePermission('police.personnel.write')
  async propose(@Req() req: AuthedRequest, @Body() dto: ProposePostingDto) {
    const officer = await this.prisma.policePersonnel.findUnique({ where: { id: dto.personnelId }, include: { currentOrgUnit: true } });
    if (!officer) throw new BadRequestException('Unknown officer');
    await assertInScope(this.audit, req, req.scope!, officer.currentOrgUnit.path, 'police_personnel', officer.id);
    if (officer.status !== 'ACTIVE') throw new ConflictException('Only active personnel can be posted');
    const to = await this.prisma.organizationalUnit.findFirst({ where: { id: dto.toOrgUnitId, ...POLICE, validTo: null } });
    if (!to) throw new BadRequestException('Unknown destination unit');
    if (to.id === officer.currentOrgUnitId) throw new BadRequestException('The officer already serves in that unit');
    if (await this.prisma.policePosting.count({ where: { personnelId: officer.id, status: { in: ['PROPOSED', 'APPROVED'] } } })) throw new ConflictException('This officer already has a posting in progress');
    const posting = await this.prisma.policePosting.create({ data: { personnelId: officer.id, fromOrgUnitId: officer.currentOrgUnitId, toOrgUnitId: to.id, status: 'PROPOSED', reason: dto.reason, initiatedById: req.auth!.user.id } });
    await this.audit.record(req, { action: 'police.posting.propose', outcome: 'SUCCESS', entityType: 'police_posting', entityId: posting.id });
    return posting;
  }

  private async posting(id: string) {
    const p = await this.prisma.policePosting.findUnique({ where: { id }, include: postingInclude });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Post('postings/:id/approve')
  @RequirePermission('police.posting.approve')
  async approve(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const p = await this.posting(id);
    await assertInScope(this.audit, req, req.scope!, p.fromOrgUnit?.path ?? p.toOrgUnit.path, 'police_posting', id); // releasing command approves
    if (p.status !== 'PROPOSED') throw new ConflictException(`Posting is ${p.status}, not awaiting approval`);
    await assertDifferentActor(this.audit, req, p.initiatedById, 'police.posting.approve', 'police_posting', id);
    const updated = await this.prisma.policePosting.update({ where: { id }, data: { status: 'APPROVED', approvedById: req.auth!.user.id, approvedAt: new Date() } });
    await this.audit.record(req, { action: 'police.posting.approve', outcome: 'SUCCESS', entityType: 'police_posting', entityId: id });
    return updated;
  }

  @Post('postings/:id/reject')
  @RequirePermission('police.posting.approve')
  async reject(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto) {
    const p = await this.posting(id);
    await assertInScope(this.audit, req, req.scope!, p.status === 'APPROVED' ? p.toOrgUnit.path : (p.fromOrgUnit?.path ?? p.toOrgUnit.path), 'police_posting', id);
    if (!['PROPOSED', 'APPROVED'].includes(p.status)) throw new ConflictException(`Posting is ${p.status} and can no longer be rejected`);
    const updated = await this.prisma.policePosting.update({ where: { id }, data: { status: 'REJECTED', reason: `${p.reason ?? ''} | Rejected: ${dto.reason}` } });
    await this.audit.record(req, { action: 'police.posting.reject', outcome: 'SUCCESS', entityType: 'police_posting', entityId: id });
    return updated;
  }

  @Post('postings/:id/confirm')
  @RequirePermission('police.posting.approve')
  async confirm(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const p = await this.posting(id);
    await assertInScope(this.audit, req, req.scope!, p.toOrgUnit.path, 'police_posting', id); // receiving command confirms
    if (p.status !== 'APPROVED') throw new ConflictException(`Posting is ${p.status}, not awaiting confirmation`);
    await assertDifferentActor(this.audit, req, p.initiatedById, 'police.posting.confirm', 'police_posting', id);
    const now = new Date(); const me = req.auth!.user.id;
    const [, updated] = await this.prisma.$transaction([
      this.prisma.policePosting.updateMany({ where: { personnelId: p.personnelId, status: 'CONFIRMED', effectiveTo: null }, data: { status: 'ENDED', effectiveTo: now } }),
      this.prisma.policePosting.update({ where: { id }, data: { status: 'CONFIRMED', confirmedById: me, confirmedAt: now, effectiveFrom: now } }),
      this.prisma.policePersonnel.update({ where: { id: p.personnelId }, data: { currentOrgUnitId: p.toOrgUnitId } }),
    ]);
    await this.audit.record(req, { action: 'police.posting.confirm', outcome: 'SUCCESS', entityType: 'police_posting', entityId: id, detail: { personnelId: p.personnelId, toOrgUnitId: p.toOrgUnitId } });
    return updated;
  }
}
