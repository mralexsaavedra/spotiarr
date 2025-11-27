import type { Playlist, Track as DbTrack, Prisma } from "@prisma/client";
import type { IPlaylist, TrackArtist } from "@spotiarr/shared";
import type { PlaylistRepository } from "../domain/playlists/playlist.repository";
import { prisma } from "../setup/prisma";

export class PrismaPlaylistRepository implements PlaylistRepository {
  async findAll(includesTracks = false, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    const playlists = await prisma.playlist.findMany({
      where: where as Prisma.PlaylistWhereInput | undefined,
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

  private mapToIPlaylist(playlist: Playlist & { tracks?: DbTrack[] }): IPlaylist {
    return {
      id: playlist.id,
      name: playlist.name ?? undefined,
      type: (playlist.type as IPlaylist["type"]) ?? undefined,
      spotifyUrl: playlist.spotifyUrl,
      error: playlist.error ?? undefined,
      subscribed: playlist.subscribed,
      createdAt: playlist.createdAt ? Number(playlist.createdAt) : undefined,
      coverUrl: playlist.coverUrl ?? undefined,
      artistImageUrl: playlist.artistImageUrl ?? undefined,
      tracks: playlist.tracks?.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album ?? undefined,
        albumYear: track.albumYear ?? undefined,
        trackNumber: track.trackNumber ?? undefined,
        spotifyUrl: track.spotifyUrl ?? undefined,
        trackUrl: track.trackUrl ?? undefined,
        artists: track.artists ? (track.artists as unknown as TrackArtist[]) : undefined,
        youtubeUrl: track.youtubeUrl ?? undefined,
        status: track.status as unknown as IPlaylist["tracks"] extends (infer T)[] | undefined
          ? T extends { status?: infer S }
            ? S
            : undefined
          : undefined,
        error: track.error ?? undefined,
        createdAt: track.createdAt ? Number(track.createdAt) : undefined,
        completedAt: track.completedAt ? Number(track.completedAt) : undefined,
        playlistId: track.playlistId ?? undefined,
      })),
    };
  }
}
