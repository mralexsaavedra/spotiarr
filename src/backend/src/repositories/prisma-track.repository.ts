import type { ITrack } from "@spotiarr/shared";
import type { TrackRepository } from "../domain/tracks/track.repository";
import { prisma } from "../setup/prisma";

export class PrismaTrackRepository implements TrackRepository {
  async findAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    const tracks = await prisma.track.findMany({
      where: where as any,
      include: { playlist: true },
    });
    return tracks.map(this.mapToITrack);
  }

  async findAllByPlaylist(playlistId: string): Promise<ITrack[]> {
    const tracks = await prisma.track.findMany({
      where: { playlistId },
      include: { playlist: true },
    });
    return tracks.map(this.mapToITrack);
  }

  async findOne(id: string): Promise<ITrack | null> {
    const track = await prisma.track.findUnique({ where: { id } });
    return track ? this.mapToITrack(track) : null;
  }

  async findOneWithPlaylist(id: string): Promise<ITrack | null> {
    const track = await prisma.track.findUnique({
      where: { id },
      include: { playlist: true },
    });
    return track ? this.mapToITrack(track) : null;
  }

  async save(track: ITrack): Promise<ITrack> {
    const created = await prisma.track.create({
      data: {
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumYear: track.albumYear,
        trackNumber: track.trackNumber,
        spotifyUrl: track.spotifyUrl,
        trackUrl: track.trackUrl,
        artists: track.artists as any,
        youtubeUrl: track.youtubeUrl,
        status: track.status || "New",
        error: track.error,
        createdAt: track.createdAt ? BigInt(track.createdAt) : BigInt(Date.now()),
        completedAt: track.completedAt ? BigInt(track.completedAt) : null,
        playlistId: track.playlistId,
      },
    });
    return this.mapToITrack(created);
  }

  async update(id: string, track: Partial<ITrack>): Promise<void> {
    await prisma.track.update({
      where: { id },
      data: {
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumYear: track.albumYear,
        trackNumber: track.trackNumber,
        spotifyUrl: track.spotifyUrl,
        trackUrl: track.trackUrl,
        artists: track.artists as any,
        youtubeUrl: track.youtubeUrl,
        status: track.status,
        error: track.error,
        completedAt: track.completedAt ? BigInt(track.completedAt) : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.track.delete({ where: { id } });
  }

  async deleteAll(ids: string[]): Promise<void> {
    await prisma.track.deleteMany({ where: { id: { in: ids } } });
  }

  private mapToITrack(track: any): ITrack {
    return {
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      albumYear: track.albumYear,
      trackNumber: track.trackNumber,
      spotifyUrl: track.spotifyUrl,
      trackUrl: track.trackUrl,
      artists: track.artists,
      youtubeUrl: track.youtubeUrl,
      status: track.status,
      error: track.error,
      createdAt: track.createdAt ? Number(track.createdAt) : undefined,
      completedAt: track.completedAt ? Number(track.completedAt) : undefined,
      playlistId: track.playlistId,
    };
  }
}
