import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) q?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) status?: string;
}

export const paging = (q: ListQuery) => ({ skip: (q.page - 1) * q.pageSize, take: q.pageSize });
export const page = <T>(items: T[], total: number, q: ListQuery) => ({ items, total, page: q.page, pageSize: q.pageSize });
