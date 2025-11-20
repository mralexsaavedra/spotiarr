import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { EnvironmentEnum } from './environmentEnum';

/**
 * Validates required environment variables before application bootstrap
 * @throws {Error} If any required variable is missing
 */
function validateEnvironment(): void {
  const required = [
    {
      key: EnvironmentEnum.SPOTIFY_CLIENT_ID,
      description: 'Spotify API Client ID',
    },
    {
      key: EnvironmentEnum.SPOTIFY_CLIENT_SECRET,
      description: 'Spotify API Client Secret',
    },
    { key: EnvironmentEnum.REDIS_HOST, description: 'Redis host address' },
    { key: EnvironmentEnum.REDIS_PORT, description: 'Redis port number' },
    {
      key: EnvironmentEnum.DOWNLOADS_PATH,
      description: 'Downloads directory path',
    },
  ];

  const missing: string[] = [];

  for (const { key, description } of required) {
    if (!process.env[key]) {
      missing.push(`  - ${key}: ${description}`);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Environment validation failed!\n');
    console.error('Missing required environment variables:\n');
    console.error(missing.join('\n'));
    console.error(
      '\nPlease check your .env file and ensure all required variables are set.',
    );
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
}

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();

if (!process.env[EnvironmentEnum.DOWNLOADS_PATH]) {
  throw new Error('DOWNLOADS_PATH environment variable is missing');
}
const folderName = resolve(
  __dirname,
  process.env[EnvironmentEnum.DOWNLOADS_PATH],
);
if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName);
}

try {
  // not good idea, but I want to keep simple Dockerfile, I know ideally should be in another container and used docker compose
  if (Boolean(process.env[EnvironmentEnum.REDIS_RUN])) {
    exec(`redis-server --port ${process.env.REDIS_PORT}`);
  }
} catch (e) {
  console.log('Unable to run redis server form app');
  console.log(e);
}
