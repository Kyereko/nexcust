import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

/**
 * Vercel Function entry point. The Nest application is built once per warm instance and reused;
 * the same middleware stack as main.ts (gateway check, helmet, cookies, validation) applies.
 */
type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let server: Promise<Handler> | undefined;

async function build(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', true);
  configureApp(app);
  await app.init();
  return express as Handler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  server ??= build();
  (await server)(req, res);
}
