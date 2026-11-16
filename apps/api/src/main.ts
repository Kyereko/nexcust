import './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // behind the Next.js proxy / load balancer
  configureApp(app);
  const config = new DocumentBuilder()
    .setTitle('NEXCUST API — DEMONSTRATION')
    .setDescription('Prototype API using synthetic data. Not an official Ghana Police Service or Ghana Prisons Service system.')
    .setVersion('0.1.0').addCookieAuth(process.env.SESSION_COOKIE_NAME ?? 'nx_session').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`NEXCUST API listening on :${port} (docs at /api/docs)`);
}
main();
