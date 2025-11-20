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
    this.io.emit(WsTrackOperation.Update, track);
  }

  emitDelete(id: number): void {
    this.io.emit(WsTrackOperation.Delete, { id });
  }
}
