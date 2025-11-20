import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PlaylistEntity } from './playlist.entity';
import { Injectable } from '@nestjs/common';

export enum WsPlaylistOperation {
  New = 'playlistNew',
  Update = 'playlistUpdate',
  Delete = 'playlistDelete',
}

@WebSocketGateway()
@Injectable()
export class PlaylistGateway {
  @WebSocketServer() io: Server;

  emitNew(playlist: PlaylistEntity): void {
    this.io.emit(WsPlaylistOperation.New, playlist);
  }

  emitUpdate(playlist: PlaylistEntity): void {
    this.io.emit(WsPlaylistOperation.Update, playlist);
  }

  emitDelete(id: number): void {
    this.io.emit(WsPlaylistOperation.Delete, { id });
  }
}
