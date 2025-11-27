import type { IPlaylist } from "@spotiarr/shared";
import type { PlaylistRepository } from "../domain/playlists/playlist.repository";
import { prisma } from "../setup/prisma";

export class PrismaPlaylistRepository implements PlaylistRepository {
  async findAll(includesTracks = false, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    const playlists = await prisma.playlist.findMany({
      where: where as any,
      include: { tracks: includesTracks },
    });
    return playlists.map(this.mapToIPlaylist);
  }

  async findOne(id: string): Promise<IPlaylist | null> {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: { tracks: true },
    });
    return playlist ? this.mapToIPlaylist(playlist) : null;
  }

  async save(playlist: IPlaylist): Promise<IPlaylist> {
    const created = await prisma.playlist.create({
      data: {
        id: playlist.id,
        name: playlist.name,
        type: playlist.type,
        spotifyUrl: playlist.spotifyUrl,
        error: playlist.error,
        subscribed: playlist.subscribed ?? false,
        createdAt: playlist.createdAt ? BigInt(playlist.createdAt) : BigInt(Date.now()),
        coverUrl: playlist.coverUrl,
        artistImageUrl: playlist.artistImageUrl,
      },
    });
    return this.mapToIPlaylist(created);
  }

  async update(id: string, playlist: Partial<IPlaylist>): Promise<void> {
    await prisma.playlist.update({
      where: { id },
      data: {
        name: playlist.name,
        type: playlist.type,
        error: playlist.error,
        subscribed: playlist.subscribed,
        coverUrl: playlist.coverUrl,
        artistImageUrl: playlist.artistImageUrl,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.playlist.delete({ where: { id } });
  }

  private mapToIPlaylist(playlist: any): IPlaylist {
    return {
      id: playlist.id,
      name: playlist.name,
      type: playlist.type,
      spotifyUrl: playlist.spotifyUrl,
      error: playlist.error,
      subscribed: playlist.subscribed,
      createdAt: playlist.createdAt ? Number(playlist.createdAt) : undefined,
      coverUrl: playlist.coverUrl,
      artistImageUrl: playlist.artistImageUrl,
      tracks: playlist.tracks?.map((track: any) => ({
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
      })),
    };
  }
}
