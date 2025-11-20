import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { ConfigModule } from '@nestjs/config';
import { SpotifyService } from './spotify.service';
import { YoutubeService } from './youtube.service';
import { SpotifyApiService } from './spotify-api.service';
import { TrackFileHelper } from './track-file.helper';

@Module({
  imports: [ConfigModule],
  providers: [
    UtilsService,
    SpotifyService,
    YoutubeService,
    SpotifyApiService,
    TrackFileHelper,
  ],
  controllers: [],
  exports: [
    UtilsService,
    SpotifyService,
    YoutubeService,
    SpotifyApiService,
    TrackFileHelper,
  ],
})
export class SharedModule {}
