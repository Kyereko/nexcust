process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgresql://justiceone:justiceone@localhost:5432/justiceone_test?schema=public';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.API_RATE_LIMIT = '100000';
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.module';

export const PW = process.env.DEMO_PASSWORD ?? 'Demo!Pass2026';

export async function startApp() {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = mod.createNestApplication(); configureApp(app); await app.init();
  const prisma = app.get(PrismaService);
  const agents: Record<string, ReturnType<typeof request.agent>> = {};
  const as = async (email: string) => {
    if (!agents[email]) { const a = request.agent(app.getHttpServer()); await a.post('/api/auth/login').send({ email, password: PW }).expect(200); agents[email] = a; }
    return agents[email];
  };
  const denied = (email: string) => prisma.auditEvent.count({ where: { actorEmail: email, outcome: 'DENIED' } });
  return { app, prisma, as, denied };
}
