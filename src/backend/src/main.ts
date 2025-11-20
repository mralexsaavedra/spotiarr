import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import * as fs from 'fs';
import { resolve } from 'path';
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

  // Create downloads directory if it doesn't exist
  const folderName = resolve(
    __dirname,
    process.env[EnvironmentEnum.DOWNLOADS_PATH],
  );
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName, { recursive: true });
  }

  const app = await NestFactory.create(AppModule);

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
