import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackEntity } from './track/track.entity';
import { TrackModule } from './track/track.module';
import { PlaylistModule } from './playlist/playlist.module';
import { PlaylistEntity } from './playlist/playlist.entity';
import { resolve } from 'path';
import { EnvironmentEnum } from './environmentEnum';
import { BullModule } from '@nestjs/bullmq';
import { M3uService } from './shared/m3u.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: resolve(process.cwd(), 'config/db.sqlite'),
      entities: [TrackEntity, PlaylistEntity],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: resolve(process.cwd(), 'dist/frontend/browser'),
      exclude: ['/api/(.*)'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        defaultJobOptions: {
          removeOnComplete: true,
        },
        connection: {
          host: configService.get<string>(EnvironmentEnum.REDIS_HOST),
          port: configService.get<number>(EnvironmentEnum.REDIS_PORT),
        },
      }),
      inject: [ConfigService],
    }),
    TrackModule,
    PlaylistModule,
  ],
  controllers: [AppController],
  providers: [M3uService],
})
export class AppModule {}
