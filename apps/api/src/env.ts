import { existsSync } from 'fs';
import { resolve } from 'path';

// Load the monorepo .env for local runs. In containers, real environment variables take precedence.
for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(p)) { process.loadEnvFile(p); break; }
}
