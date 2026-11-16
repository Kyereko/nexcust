import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** Shared by main.ts and the test harness so tests exercise the real middleware stack. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
