import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { PlaylistEntity } from './playlist.entity';
import { CreatePlaylistDto, UpdatePlaylistDto } from './playlist.dto';

@Controller('playlist')
export class PlaylistController {
  constructor(private readonly service: PlaylistService) {}

  @Get()
  getAll(): Promise<PlaylistEntity[]> {
    return this.service.findAll();
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() playlist: CreatePlaylistDto): Promise<void> {
    await this.service.create(playlist as PlaylistEntity);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  update(
    @Param('id') id: number,
    @Body() playlist: UpdatePlaylistDto,
  ): Promise<void> {
    return this.service.update(id, playlist);
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<void> {
    return this.service.remove(id);
  }

  @Get('retry/:id')
  retryFailedOfPlaylist(@Param('id') id: number): Promise<void> {
    return this.service.retryFailedOfPlaylist(id);
  }
}
