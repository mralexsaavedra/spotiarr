import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistEntity } from './playlist.entity';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';
import { PlaylistGateway } from './playlist.gateway';
import { PlaylistRepository } from './playlist.repository';
import { CreatePlaylistUseCase } from './use-cases/create-playlist.use-case';
import { TrackModule } from '../track/track.module';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlaylistEntity]),
    ConfigModule,
    TrackModule,
    SharedModule,
  ],
  providers: [
    PlaylistService,
    PlaylistRepository,
    PlaylistGateway,
    CreatePlaylistUseCase,
  ],
  controllers: [PlaylistController],
  exports: [PlaylistService],
})
export class PlaylistModule {}
