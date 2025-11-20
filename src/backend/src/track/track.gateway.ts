import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TrackEntity } from './track.entity';
import { Injectable } from '@nestjs/common';

export enum WsTrackOperation {
  New = 'trackNew',
  Update = 'trackUpdate',
  Delete = 'trackDelete',
}

@WebSocketGateway()
@Injectable()
export class TrackGateway {
  @WebSocketServer() io: Server;

  emitNew(track: TrackEntity, playlistId: number): void {
    this.io.emit(WsTrackOperation.New, { track, playlistId });
  }

  emitUpdate(track: TrackEntity): void {
    const playlistId =
      (track.playlist && track.playlist.id) || (track as any).playlistId;
    this.io.emit(WsTrackOperation.Update, { track, playlistId });
  }

  emitDelete(id: number): void {
    this.io.emit(WsTrackOperation.Delete, { id });
  }
}
