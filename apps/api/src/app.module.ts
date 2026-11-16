import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessGuard } from './auth/access.guard';
import { SharedModule } from './shared/shared.module';
import { PoliceModule } from './police/police.module';
import { PrisonsModule } from './prisons/prisons.module';
import { ApplicantModule } from './applicant/applicant.module';
import { ExchangeModule } from './exchange/exchange.module';

/**
 * Modular monolith. Police and Prisons modules never import each other;
 * anything they share goes through the shared layer (auth, audit, person index, exchange).
 */
@Module({
  imports: [
    // Per client IP (the web tier forwards the real client address). Sign-in has its own, much lower limit.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.API_RATE_LIMIT ?? 600) }]),
    PrismaModule, AuditModule, AuthModule, SharedModule, PoliceModule, PrisonsModule, ApplicantModule, ExchangeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
