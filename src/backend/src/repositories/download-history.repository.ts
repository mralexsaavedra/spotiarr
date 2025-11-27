import { Repository } from "typeorm";
import type { HistoryRepository } from "../domain/history/history.repository";
import { DownloadHistoryEntity } from "../entities/download-history.entity";
import { getDataSource } from "../setup/database";

export class DownloadHistoryRepository implements HistoryRepository {
  private get repository(): Repository<DownloadHistoryEntity> {
    return getDataSource().getRepository(DownloadHistoryEntity);
  }

  findAll(limit = 200): Promise<DownloadHistoryEntity[]> {
    return this.repository.find({
      order: { completedAt: "DESC" },
      take: limit,
      relations: { playlist: true, track: true },
    });
  }

  async createFromTrack(track: import("../entities/track.entity").TrackEntity): Promise<void> {
    if (!track.completedAt || !track.playlist) return;

    const entry = this.repository.create({
      playlist: track.playlist,
      track,
      playlistName: track.playlist.name || track.playlist.spotifyUrl,
      playlistSpotifyUrl: track.playlist.spotifyUrl,
      trackName: track.name,
      artist: track.artist,
      album: track.album,
      trackUrl: track.trackUrl,
      completedAt: track.completedAt,
    });

    await this.repository.save(entry);
  }
}
