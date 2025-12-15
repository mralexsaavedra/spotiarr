import type { DownloadHistoryItem, ITrack } from "@spotiarr/shared";
import type { HistoryRepository } from "@/domain/repositories/history.repository";
import { prisma } from "../setup/prisma";

export class PrismaHistoryRepository implements HistoryRepository {
  async findAll(limit = 100): Promise<DownloadHistoryItem[]> {
    const history = await prisma.downloadHistory.findMany({
      take: limit,
      orderBy: { completedAt: "desc" },
    });

    return history.map((h) => ({
      id: h.id,
      playlistId: h.playlistId,
      playlistName: h.playlistName,
      playlistSpotifyUrl: h.playlistSpotifyUrl,
      trackId: h.trackId,
      trackName: h.trackName,
      artist: h.artist,
      album: h.album,
      trackUrl: h.trackUrl,
      completedAt: Number(h.completedAt),
    }));
  }

  async createFromTrack(track: ITrack): Promise<void> {
    let playlistName = "Unknown";
    let playlistSpotifyUrl: string | null = null;

    if (track.playlistId) {
      const playlist = await prisma.playlist.findUnique({
        where: { id: track.playlistId },
        select: { name: true, spotifyUrl: true },
      });

      if (playlist) {
        playlistName = playlist.name || "Unknown";
        playlistSpotifyUrl = playlist.spotifyUrl;
      }
    }

    await prisma.downloadHistory.create({
      data: {
        playlistId: track.playlistId || null,
        trackId: track.id || null,
        playlistName,
        playlistSpotifyUrl,
        trackName: track.name,
        artist: track.artist,
        album: track.album || null,
        trackUrl: track.trackUrl || null,
        completedAt: BigInt(Date.now()),
        createdAt: BigInt(Date.now()),
      },
    });
  }
}
